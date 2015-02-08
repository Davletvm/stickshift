Object.assign = require('object-assign');

var EventStore = require('../stores/event_store.js');
var React = require('react');

var Chart = React.createClass({
  mixins: [EventStore.listenTo],
  _onChange: function() {
    this.setState({
      events: EventStore.all()
    });
  },
  getInitialState() {
    return { events: EventStore.all(), tooltip: '' };
  },
  resize() {
    var s = this.state;
    s.tall = !s.tall;
    this.setState(s);
  },
  drawChart() {
    if (this.state.events.length && this.makeSpec()) {
      vg.parse.spec(this.makeSpec(), chart => {
          var c = chart({
              el: this.refs.chart.getDOMNode()
          }).update();
          c.on('mouseover', (e, d) => {
            this.refs.tooltip.getDOMNode().innerHTML = d.datum.data.c + ' = ' + d.datum.data.y +
              ' on ' +
              d3.time.format('%x')(new Date(d.datum.data.x));
          });
          c.on('mouseout', (e, d) => {
            this.refs.tooltip.getDOMNode().innerHTML = '';
          });
      });
    }
  },
  share() {
    var a = document.createElement('a');
    a.download = "chart.png";
    a.href = this.refs.chart.getDOMNode().getElementsByTagName('canvas')[0].toDataURL('image/png');
    a.click();
  },
  componentDidUpdate() {
    this.drawChart();
  },
  componentDidMount() {
    this.drawChart();
  },
  makeSpec() {
    if (!this.state.events.length) return {};
    var columns = Object.keys(this.state.events[0]);
    var events = JSON.parse(JSON.stringify(this.state.events));
    var datecolumn;
    var values = [], dates = [], yValues = [];
    // parsing dates outside of vega will not work: vega does a json
    // stringify loop internally
    if (+new Date(events[0][columns[0]])) {
        datecolumn = columns[0];
        events.forEach(function(e) {
            for (var i = 1; i < columns.length; i++) {
                var parsed = parseFloat(e[columns[i]]);
                dates.push(new Date(e[datecolumn]));
                yValues.push(parsed);
                if (!isNaN(parsed)) {
                    values.push({
                        x: e[columns[0]],
                        y: parsed,
                        c: columns[i]
                    });
                }
            }
        });
    }
    if (!datecolumn) return false;

    var padding = {"top": 10, "left": 40, "bottom": 15, "right": 10};
    var chartWidth = this.props.width - padding.left - padding.right;

    var dateRange = d3.extent(dates);
    dates.sort(function(a, b) { return a - b; });
    var gaps = [];
    for (var i = 0; i < dates.length - 1; i++) {
      gaps.push(dates[i + 1] - dates[i]);
    }
    // avoid gaps of 0
    gaps = gaps.filter(function(_) { return _; });
    var minGap = d3.min(gaps);
    var barWidth = Math.floor(chartWidth / ((dateRange[1] - dateRange[0]) / minGap)) - 2;

    return {
      "width": chartWidth,
      "height": this.state.tall ? window.innerHeight - padding.top - padding.bottom : 200,
      "padding": padding,
      "data": [
        {
          "name": "table",
          "format": {type:'json', parse:
            {"x":"date"}
          },
          "values": values
        },
        {
          "name": "stats",
          "source": "table",
          "transform": [
            {"type": "facet", "keys": ["data.x"]},
            {"type": "stats", "value": "data.y"}
          ]
        }
      ],
      "scales": [{
          "name": "x",
          "type": "time",
          clamp: true,
          "range": "width",
          "domain": {"data": "table", "field": "data.x"}
        }, {
          "name": "y",
          "type": "linear",
          "range": "height",
          "nice": true,
          "domain": {"data": "stats", "field": "sum"}
        }, {
          "name": "color",
          "type": "ordinal",
          "domain": {"data": "table", "field": "data.c"},
          "range": ['#56b881','#3887be','#8a8acb','#ee8a65']
        }
      ],
      "axes": [
        {
          "type": "x",
          "scale": "x",
          "format":"%x",
          ticks: Math.floor(chartWidth / 100),
            tickSize: 0,
          properties: {
              labels: {
                  fill: {value:'#b3b3b1'}
              },
              "axis": {
                 "stroke": {"value": '#b3b3b1'},
              }
          }
        },
        {
            "type": "y",
            tickSize: 0,
            format: ',s',
            "scale": "y",
            properties: {
                labels: {
                    fill: {value:'#b3b3b1'}
                },
                "axis": {
                   "stroke": {"value": '#b3b3b1'},
                }
            }
        }
      ],
      "legends": [
    {
      "fill": "color",
      "title": "Species",
      "offset": 0,
      "properties": {
        "symbols": {
          "fillOpacity": {"value": 0.5},
          "stroke": {"value": "transparent"}
        }
      }
    }
      ],
      "marks": [
        {
          "type": "group",
          "from": {
            "data": "table",
            "transform": [
              {"type": "facet", "keys": ["data.c"]},
              {"type": "stack", "point": "data.x", "height": "data.y"}
            ]
          },
          "marks": [
            {
              "type": "rect",
              "properties": {
                "enter": {
                  "x": { "scale": "x", "field": "data.x" },
                  "width": { value: barWidth },
                  "y": { "scale": "y", "field": "y" },
                  "y2": { "scale": "y", "field": "y2" },
                  "fill": {"scale": "color", "field": "data.c"}
                },
                "update": {
                  "fillOpacity": {"value": 1}
                },
                "hover": {
                  "fillOpacity": {"value": 0.5}
                }
              }
            }
          ]
        }
      ]
    };
  },
  render() {
    if (this.state.events.length && this.makeSpec()) {
        return (<div>
          <div className='col12 pad2 contain'>
            <div ref='tooltip' className='pin-top pad0y center fill-lighten0'></div>
            <div className='text-right hide-mobile'>
                <a className='icon u-d-arrow pad2x' onClick={this.resize}>resize</a>
                <a className='icon share' onClick={this.share}>save</a>
            </div>
            <div ref='chart'></div>
          </div>
        </div>);
    } else {
        return <div></div>;
    }
  }
});

module.exports = Chart;