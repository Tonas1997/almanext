var width = $('#info-second-row').width();
var height = $('#info-second-row').height();
var ratio = 0
var margin = {left: 50, right: 20, top: 20, bottom: 20};

var svg, xScale, yScale, xAxis, yAxis, g

var colorScale;

var minF;
var maxF;
var minC;
var maxC;
var minS;
var maxS;

export function showFreqHistogram(plot_properties, plot_cs)
{
    minF = plot_properties.min_frequency
    maxF = plot_properties.max_frequency
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens

    width = $('#info-second-row').width();
    height = $('#info-second-row').height();
    ratio = width / (maxF - minF)
    //margin = 5;
    
    // X axis and scale (frequency)
    xScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([margin.left, width - margin.right]);
    xAxis = d3.axisBottom()
        .scale(xScale)

    yScale = d3.scaleLinear()
        .domain([0, maxC])
        .range([height - margin.bottom, margin.top])
    yAxis = d3.axisLeft()
        .scale(yScale)

    colorScale = d3.scaleLinear()
        .domain([minS, maxS])
        .range([0, 1])

    // Create an SVG object
    svg = d3.select("#info-second-row")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("margin-top", margin.top)

    g = svg.append("g")
        .attr('transform', 'translate(0,' + (height-margin.bottom) + ')')
        .call(xAxis)
    g = svg.append("g")
        .attr("transform", 'translate(' + margin.left + ',0)')
        .call(yAxis)

    // draw the CS graph
    drawCSPoints(plot_cs)   
}

export function updateFreqHistogramAxis(plot_properties, plot_cs)
{
    // get the new plot's properties
    minF = plot_properties.min_frequency
    maxF = plot_properties.max_frequency
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens
    // update the axis (with animations!)
    xScale.domain([minF, maxF])
    yScale.domain([minC, maxC])
    ratio = width / (maxF - minF)
    g.transition().duration(2000).call(xAxis)
    g.transition().duration(2000).call(yAxis)
    // redraw the CS graph
    drawCSPoints(plot_cs)
}

var scale = 1

export function updateFreqHistogram(observations)
{
    //console.log(observations)
    svg.selectAll('rect').remove()

    if(observations != null)
    {
        svg.selectAll('rect')
        .data(observations)
        .enter()
        .each(function(o) {

            svg.selectAll('asd')
            .data(o.freq_windows)
            .enter()
            .append('rect')
            .attr("x", function(w) { return xScale(w.start)})
            .attr("y", function() { return height - (scale*height) + margin.top})
            .attr("width", function(w) { return (w.end - w.start) * ratio})
            .attr("height", height-margin.bottom-margin.top)
            .attr("stroke-width", 0)
            .attr("fill", "#373755")
            .attr("opacity", function(w) { 
                return (colorScale(w.sensitivity_10kms))})
        })
    }
}

function drawCSPoints(plot_cs)
{
    console.log(yScale.domain())
    svg.selectAll('path').remove()
    var cs_line = d3.line()
        .x(function(d) { return xScale(d.freq)})
        .y(function(d) { return d.cs == 0? yScale(minC): yScale(d.cs)})

    console.log(plot_cs)
    svg.append('path')
        .data([plot_cs])
        .attr('class', 'line')
        .attr('d', cs_line)
}

