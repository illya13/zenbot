let z = require('zero-fill')
  , n = require('numbro')
  , bollinger = require('../../../lib/bollinger')
  , rsi = require('../../../lib/rsi')
  , ema = require('../../../lib/ema')


function getUpperBound(s) {
  return s.period.bollinger.upper[s.period.bollinger.upper.length-1]
}

function isUpper(s, upperBound) {
  return s.period.close > (upperBound / 100) * (100 - s.options.bollinger_upper_bound_pct)
}

function getLowerBound(s) {
  return s.period.bollinger.lower[s.period.bollinger.lower.length-1]
}

function isLower(s, lowerBound) {
  return s.period.close < (lowerBound / 100) * (100 + s.options.bollinger_lower_bound_pct)
}

function getMiddle(s) {
  return s.period.bollinger.mid[s.period.bollinger.upper.length-1]
}

function isRSIUpper(s) {
  return s.period.rsi > s.options.rsi_upper
}

function isRSILower(s) {
  return s.period.rsi < s.options.rsi_lower
}

function inBounds(s, upperBound, lowerBound) {
  if (isUpper(s, upperBound) && isRSIUpper(s)) {
    s.last_hit_bollinger = 'upper'
    return false
  } else if (isLower(s, lowerBound) && isRSILower(s)) {
    s.last_hit_bollinger = 'lower'
    return false
  }
  return true
}

function getBBW(s, upperBound, lowerBound) {
  return (upperBound - lowerBound) / getMiddle(s)
}

function filteredByBBW(s, bbw) {
  return bbw < s.options.bollinger_width_threshold
}

function getBBWColor(s, bbw) {
  return (filteredByBBW(s, bbw)) ? 'grey' : 'cyan'
}

function getBBColor(s, upperBound, lowerBound) {
  if (isUpper(s, upperBound)) {
    return 'green'
  } else if (isLower(s, lowerBound)) {
    return 'red'
  } else {
    return 'grey'
  }
}

function getRSIColor(s) {
  if (isRSIUpper(s)) {
    return 'green'
  } else if (isRSILower(s)) {
    return 'red'
  } else {
    return 'grey'
  }
}

function getBoundsColor(s, upperBound, lowerBound) {
  if (isUpper(s, upperBound) && isRSIUpper(s)) {
    return 'green'
  } else if (isLower(s, lowerBound) && isRSILower(s)) {
    return 'red'
  } else {
    return 'grey'
  }
}

function getBoundsText(color) {
  if (color === 'green') {
    return '  up '
  } else if (color === 'red') {
    return ' low '
  } else {
    return ' mid '
  }
}

function macd(s) {
  ema(s, 'ema_short', s.options.ema_short_period)
  ema(s, 'ema_long', s.options.ema_long_period)
  if (s.period.ema_short && s.period.ema_long) {
    s.period.macd = (s.period.ema_short - s.period.ema_long)
    ema(s, 'signal', s.options.signal_period, 'macd')
    if (s.period.signal) {
      s.period.macd_histogram = s.period.macd - s.period.signal
    }
  }
}

function getMACDColor(s) {
  if (s.period.macd_histogram > 0) {
    return 'green'
  }
  else if (s.period.macd_histogram < 0) {
    return 'red'
  } else {
    return 'grey'
  }
}


module.exports = {
  name: 'trend_bollinger',
  description: 'Buy when (Signal ≤ Lower Bollinger Band && trend up) and sell when (Signal ≥ Upper Bollinger Band && trend down).',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '1h')
    this.option('period_length', 'period length, same as --period', String, '1h')
    this.option('min_periods', 'min. number of history periods', Number, 52)

    this.option('bollinger_size', 'period size', Number, 20)
    this.option('bollinger_time', 'times of standard deviation between the upper band and the moving averages', Number, 2)
    this.option('bollinger_upper_bound_pct', 'pct the current price should be near the bollinger upper bound before we sell', Number, 0)
    this.option('bollinger_lower_bound_pct', 'pct the current price should be near the bollinger lower bound before we buy', Number, 0)
    this.option('bollinger_width_threshold', 'bollinger width threshold', Number, 0.07)

    this.option('rsi_periods', 'number of RSI periods', 14)
    this.option('rsi_upper', 'RSI upper band', Number, 70)
    this.option('rsi_lower', 'RSI lower band', Number, 30)

    this.option('ema_short_period', 'number of periods for the shorter EMA', Number, 12)
    this.option('ema_long_period', 'number of periods for the longer EMA', Number, 26)
    this.option('signal_period', 'number of periods for the signal EMA', Number, 9)
  },

  calculate: function (s) {
    bollinger(s, 'bollinger', s.options.bollinger_size)
    rsi(s, 'rsi', s.options.rsi_periods)
    macd(s)
  },

  onPeriod: function (s, cb) {
    if (s.in_preroll) return cb()

    if (s.period.bollinger && s.period.bollinger.upper && s.period.bollinger.lower) {
      let upperBound = getUpperBound(s)
      let lowerBound = getLowerBound(s)
      let bbw = getBBW(s, upperBound, lowerBound)

      // trend
      let trend
      if (inBounds(s, upperBound, lowerBound)) {
        if (s.last_hit_bollinger === 'upper' && s.period.close < s.last_hit_close) {
          trend = 'down'
        } else if (s.last_hit_bollinger === 'lower' && s.period.close > s.last_hit_close) {
          trend = 'up'
        }
        s.last_hit_bollinger = 'middle'
      }
      s.last_hit_close = s.period.close

      // signal
      s.signal = null
      if (!filteredByBBW(s, bbw)) {
        if (trend === 'down') {
          s.signal = 'sell'
        } else if (trend === 'up') {
          s.signal = 'buy'
        }
      }
    }
    cb()
  },

  onReport: function (s) {
    let cols = []

    if (typeof s.period.macd_histogram === 'number') {
      let color = getMACDColor(s)
      cols.push(z(9, n(s.period.macd_histogram).format('+0.00000'), ' ')[color])
    }

    if (s.period.bollinger && s.period.bollinger.upper && s.period.bollinger.lower) {
      let upperBound = getUpperBound(s)
      let lowerBound = getLowerBound(s)
      let bbw = getBBW(s, upperBound, lowerBound)

      let color = getBBWColor(s, bbw)
      cols.push(z(6, n(bbw).format('0.000').substring(0,5), ' ')[color])

      color = getBBColor(s, upperBound, lowerBound)
      cols.push(z(10, n(lowerBound).format('0.00000000').substring(0,9), ' ')[color])
      cols.push(z(10, n(upperBound).format('0.00000000').substring(0,9), ' ')[color])

      if (typeof s.period.rsi === 'number') {
        color = getRSIColor(s)
        cols.push(z(3, n(s.period.rsi).format('0'), ' ')[color])

        color = getBoundsColor(s, upperBound, lowerBound)
        cols.push(getBoundsText(color)[color])
      }
    }

    return cols
  }
}
