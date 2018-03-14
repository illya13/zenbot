let z = require('zero-fill')
  , n = require('numbro')
  , abbreviate = require('number-abbreviate')
  , ta_trend_macd = require('../../../lib/ta_trend_macd')


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
  return s.period.bollinger.upper
}

function isUpper(s, upperBound) {
  return s.period.close > (upperBound / 100) * (100 - s.options.bollinger_upper_bound_pct)
}

function getLowerBound(s) {
  return s.period.bollinger.lower
}

function isLower(s, lowerBound) {
  return s.period.close < (lowerBound / 100) * (100 + s.options.bollinger_lower_bound_pct)
}

function getMiddle(s) {
  return s.period.bollinger.middle
}

function isRSIOverbought(s) {
  return s.period.rsi > s.options.rsi_overbought
}

function isRSIOversold(s) {
  return s.period.rsi < s.options.rsi_oversold
}

function isMACDPositive(s) {
  return s.period.macd_histogram > 0
}

function isMACDNegative(s) {
  return s.period.macd_histogram < 0
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

function isUptrendNowOrBefore(s, upperBound) {
  return isUpperHit(s, upperBound) || (lastPeriodTrendEqualsTo(s, UPTREND) && isMACDPositive(s))
}

function isDowntrendNowOrBefore(s, lowerBound) {
  return isLowerHit(s, lowerBound) || (lastPeriodTrendEqualsTo(s, DOWNTREND) && isMACDNegative(s))
}

function updateTrend(s, upperBound, lowerBound) {
  if (isUptrendNowOrBefore(s, upperBound)) {
    s.period.trend = UPTREND
  } else if (isDowntrendNowOrBefore(s, lowerBound)) {
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
    return '  up   '
  } else if (periodTrendEqualsTo(s, DOWNTREND)) {
    return '  down '
  } else if (periodTrendEqualsTo(s, SIDEWAYS_TREND)) {
    return '  side '
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
    return '  + '
  } else if (isMACDNegative(s)) {
    return '  - '
  } else {
    return '    '
  }
}

function getADXColor(s) {
  if (s.period.adx > s.options.adx_threshold) {
    return 'cyan'
  } else {
    return 'grey'
  }
}

function formatVolume(value) {
  let volume_display = (value > 999 || value < -999) ? abbreviate(value, 2) : n(value).format('0')
  volume_display = z(8, volume_display, ' ')
  if (volume_display.indexOf('.') === -1) volume_display = ' ' + volume_display
  return volume_display
}

function calcIndicators(s) {
  return ta_trend_macd(
    s, s.options.min_periods,
    s.options.bollinger_size, s.options.bollinger_time,
    s.options.rsi_periods,
    s.options.ema_short_period, s.options.ema_long_period, s.options.signal_period,
    s.options.cci_periods, s.options.cci_constant,
    s.options.stoch_k, s.options.stoch_d,
    s.options.adx_periods,
    s.options.chaikin_fast, s.options.chaikin_slow
  )
    .then((calculated) => {
      if (calculated) {
        let upperBound = getUpperBound(s)
        let lowerBound = getLowerBound(s)
        bbw(s, upperBound, lowerBound)
        updateTrend(s, upperBound, lowerBound)
      }
    })
}

function isAllSet(s) {
  return s.period.bollinger && s.period.bollinger.upper && s.period.bollinger.lower &&
    s.period.macd && s.period.rsi && s.period.cci && s.period.stoch.D && s.period.adx
}


module.exports = {
  name: 'trend_macd',
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

    this.option('rsi_periods', 'number of RSI periods', Number, 14)
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

    this.option('adx_periods', 'number of ADX periods', Number, 14)
    this.option('adx_threshold', 'adx threshold', Number, 30)

    this.option('chaikin_fast', 'Chaikin fast period', Number, 3)
    this.option('chaikin_slow', 'Chaikin slow period', Number, 10)
  },

  calculate: function (s) {
    if (s.in_preroll) return

    calcIndicators(s)
      .catch((error) => console.log(error))
  },

  onPeriod: function (s, cb) {
    if (s.in_preroll) return cb()

    calcIndicators(s)
      .then(() => {
        if (isAllSet(s)) {
          let trendBreak =
            (periodTrendEqualsTo(s, SIDEWAYS_TREND) && (lastPeriodTrendEqualsTo(s, UPTREND) || lastPeriodTrendEqualsTo(s, DOWNTREND))) ||
            (periodTrendEqualsTo(s, UPTREND) && lastPeriodTrendEqualsTo(s, DOWNTREND)) ||
            (periodTrendEqualsTo(s, DOWNTREND) && lastPeriodTrendEqualsTo(s, UPTREND))

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
      })
      .catch((error) => {
        console.log(error)
        cb()
      })
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
      cols.push((z(2, n(s.period.rsi).format('0'), ' '))[color])

      color = getStochColor(s)
      cols.push((' ' + z(3, n(s.period.stoch.D).format('000'), ' '))[color])

      color = getCCIColor(s)
      cols.push((' ' + z(4, n(s.period.cci).format('000'), ' '))[color])

      color = getTrendColor(s)
      cols.push(getTrendText(s)[color])

      color = getADXColor(s)
      cols.push((' ' + z(2, n(s.period.adx).format('0'), ' '))[color])

      cols.push((formatVolume(s.period.obv)).gray)
      cols.push((formatVolume(s.period.adosc)).gray)
    }

    return cols
  }
}
