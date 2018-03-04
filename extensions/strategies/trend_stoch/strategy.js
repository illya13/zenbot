let z = require('zero-fill')
  , n = require('numbro')
  , bollinger = require('../../../lib/bollinger')
  , rsi = require('../../../lib/rsi')
  , ema = require('../../../lib/ema')
  , cci = require('../../../lib/cci')
  , stoch = require('../../../lib/slow_stochastic')


const UPTREND = 'up', DOWNTREND = 'down', SIDEWAYS_TREND = 'side'

function trendEqualsTo(trend, t) {
  return trend === t
}

function periodTrendEqualsTo(s, t) {
  return s.period.trend && trendEqualsTo(s.period.trend, t)
}

function lastPeriodTrendEqualsTo(s, t) {
  return s.lookback[0].trend && trendEqualsTo(s.lookback[0].trend, t)
}

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

function isRSIOverbought(s) {
  return s.period.rsi > s.options.rsi_overbought
}

function isRSIOversold(s) {
  return s.period.rsi < s.options.rsi_oversold
}

function isMACDPositive(s) {
  return s.period.macd > 0
}

function isMACDNegative(s) {
  return s.period.macd < 0
}

function isCCIOverbought(s) {
  return s.period.cci > s.options.cci_overbought
}

function isCCIOversold(s) {
  return s.period.cci < s.options.cci_oversold
}

function isStochOverbought(s) {
  return s.period.stoch.D > s.options.stoch_overbought
}

function isStochOversold(s) {
  return s.period.stoch.D < s.options.stoch_oversold
}

function isUpperHit(s, upperBound) {
  return isUpper(s, upperBound) && isRSIOverbought(s) && isCCIOverbought(s) && isStochOverbought(s) && isBBWWide(s)
}

function isLowerHit(s, lowerBound) {
  return isLower(s, lowerBound) && isRSIOversold(s) && isCCIOversold(s) && isStochOversold(s) && isBBWWide(s)
}

function updateTrend(s, upperBound, lowerBound) {
  if (isUpperHit(s, upperBound)) {
    s.period.trend = UPTREND
  } else if (isLowerHit(s, lowerBound)) {
    s.period.trend = DOWNTREND
  } else {
    s.period.trend = SIDEWAYS_TREND
  }
}

function bbw(s, upperBound, lowerBound) {
  s.period.bollinger.bbw = (upperBound - lowerBound) / getMiddle(s)
}

function isBBWWide(s) {
  return s.period.bollinger.bbw > s.options.bollinger_width_threshold
}

function getBBWColor(s) {
  return (isBBWWide(s)) ? 'cyan' : 'grey'
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
  if (isRSIOverbought(s)) {
    return 'green'
  } else if (isRSIOversold(s)) {
    return 'red'
  } else {
    return 'grey'
  }
}

function getCCIColor(s) {
  if (isCCIOverbought(s)) {
    return 'green'
  } else if (isCCIOversold(s)) {
    return 'red'
  } else {
    return 'grey'
  }
}

function getStochColor(s) {
  if (isStochOverbought(s)) {
    return 'green'
  } else if (isStochOversold(s)) {
    return 'red'
  } else {
    return 'grey'
  }
}

function getTrendColor(s) {
  if (periodTrendEqualsTo(s, UPTREND)) {
    return 'green'
  } else if (periodTrendEqualsTo(s, DOWNTREND)) {
    return 'red'
  } else if (periodTrendEqualsTo(s, SIDEWAYS_TREND)) {
    return 'grey'
  }
}

function getTrendText(s) {
  if (periodTrendEqualsTo(s, UPTREND)) {
    return '  trend: up   '
  } else if (periodTrendEqualsTo(s, DOWNTREND)) {
    return '  trend: down '
  } else if (periodTrendEqualsTo(s, SIDEWAYS_TREND)) {
    return '  trend: side '
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
  if (isMACDPositive(s)) {
    return 'green'
  } else if (isMACDNegative(s)) {
    return 'red'
  } else {
    return 'grey'
  }
}

function getMACDText(s) {
  if (isMACDPositive(s)) {
    return '  macd: + '
  } else if (isMACDNegative(s)) {
    return '  macd: - '
  } else {
    return '  macd:   '
  }
}

function isAllSet(s) {
  return s.period.bollinger && s.period.bollinger.upper && s.period.bollinger.lower &&
    s.period.macd && s.period.rsi && s.period.cci && s.period.stoch.D
}


module.exports = {
  name: 'trend_stoch',
  description: 'Buy when (Signal ≤ Lower Bollinger Band && trend up) and sell when (Signal ≥ Upper Bollinger Band && trend down).',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '1h')
    this.option('period_length', 'period length, same as --period', String, '1h')
    this.option('min_periods', 'min. number of history periods', Number, 52)

    this.option('bollinger_size', 'period size', Number, 20)
    this.option('bollinger_time', 'times of standard deviation between the upper band and the moving averages', Number, 2)
    this.option('bollinger_upper_bound_pct', 'pct the current price should be near the bollinger upper bound before we sell', Number, 0)
    this.option('bollinger_lower_bound_pct', 'pct the current price should be near the bollinger lower bound before we buy', Number, 0)
    this.option('bollinger_width_threshold', 'bollinger width threshold', Number, 0.10)

    this.option('rsi_periods', 'number of RSI periods', 14)
    this.option('rsi_overbought', 'RSI upper band', Number, 70)
    this.option('rsi_oversold', 'RSI lower band', Number, 30)

    this.option('ema_short_period', 'number of periods for the shorter EMA', Number, 12)
    this.option('ema_long_period', 'number of periods for the longer EMA', Number, 26)
    this.option('signal_period', 'number of periods for the signal EMA', Number, 9)

    this.option('cci_periods', 'number of CCI periods', Number, 20)
    this.option('cci_constant', 'constant', Number, 0.015)
    this.option('cci_overbought', 'sell when CCI reaches or goes above this value', Number, 100)
    this.option('cci_oversold', 'buy when CCI reaches or drops below this value', Number, -100)

    this.option('stoch_k', '%K line', Number, 14)
    this.option('stoch_d', '%D line', Number, 3)
    this.option('stoch_overbought', 'Stoch upper band', Number, 70)
    this.option('stoch_oversold', 'Stoch lower band', Number, 30)
  },

  calculate: function (s) {
    bollinger(s, 'bollinger', s.options.bollinger_size)
    rsi(s, 'rsi', s.options.rsi_periods)
    macd(s)
    cci(s, 'cci', s.options.cci_periods, s.options.cci_constant)
    stoch(s, 'stoch', s.options.stoch_k, s.options.stoch_d)

    if (s.lookback.length > s.options.bollinger_size) {
      let upperBound = getUpperBound(s)
      let lowerBound = getLowerBound(s)
      bbw(s, upperBound, lowerBound)
      updateTrend(s, upperBound, lowerBound)
    }
  },

  onPeriod: function (s, cb) {
    if (s.in_preroll) return cb()

    if (isAllSet(s)) {
      let trendBreak =
        ( periodTrendEqualsTo(s, SIDEWAYS_TREND) && (lastPeriodTrendEqualsTo(s, UPTREND) || lastPeriodTrendEqualsTo(s, DOWNTREND)) ) ||
        ( periodTrendEqualsTo(s, UPTREND) && lastPeriodTrendEqualsTo(s, DOWNTREND) ) ||
        ( periodTrendEqualsTo(s, DOWNTREND) && lastPeriodTrendEqualsTo(s, UPTREND) )

      s.signal = null
      if (trendBreak) {
        if (lastPeriodTrendEqualsTo(s, UPTREND)) {
          s.signal = 'sell'
        } else if (lastPeriodTrendEqualsTo(s, DOWNTREND)) {
          s.signal = 'buy'
        }
      }
    }
    cb()
  },

  onReport: function (s) {
    let cols = []

    if (isAllSet(s)) {
      let upperBound = getUpperBound(s)
      let lowerBound = getLowerBound(s)

      let color = getBBWColor(s)
      cols.push(z(6, n(s.period.bollinger.bbw).format('0.000').substring(0,5), ' ')[color])

      color = getBBColor(s, upperBound, lowerBound)
      cols.push(z(10, n(lowerBound).format('0.00000000').substring(0,9), ' ')[color])
      cols.push(z(10, n(upperBound).format('0.00000000').substring(0,9), ' ')[color])

      color = getMACDColor(s)
      cols.push(getMACDText(s)[color])

      color = getRSIColor(s)
      cols.push((' rsi: ' + z(2, n(s.period.rsi).format('0'), ' '))[color])

      color = getCCIColor(s)
      cols.push(('  cci: ' + z(4, n(s.period.cci).format('000'), ' '))[color])

      color = getStochColor(s)
      cols.push(('  stoch: ' + z(3, n(s.period.stoch.D).format('000'), ' '))[color])

      color = getTrendColor(s)
      cols.push(getTrendText(s)[color])
    }

    return cols
  }
}
