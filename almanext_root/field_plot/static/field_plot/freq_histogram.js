var width = $('#info-second-row').width();
var height = $('#info-second-row').height();
var margin = {left: 50, right: 20, top: 20, bottom: 20, xlabel: 10, ylabel: 10};

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
    //margin = 5;
    
    // X axis and scale (frequency)
    xScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([margin.left, width - margin.right]);
    xAxis = d3.axisBottom()
        .ticks(10)
        .scale(xScale)

    yScale = d3.scaleLinear()
        .domain([maxC, minC])
        .range([height - margin.bottom, margin.top])
    yAxis = d3.axisLeft()
        
        .scale(yScale).ticks(10)

    colorScale = d3.scaleLinear()
        .domain([minS, maxS])
        .range([0, 1])

    // Create an SVG object
    svg = d3.select("#info-second-row")
        .append("svg")
        .attr("width", width)
        .attr("height", height + margin.bottom)
        .style("margin-top", margin.top)

    g = svg.append("g")
        .attr('id', 'x-axis')
        .attr('transform', 'translate(0,' + (height-margin.bottom) + ')')
        .call(xAxis)
    g = svg.append("text")             
        .attr("transform", "translate(" + (width/2) + " ," + (height + margin.xlabel) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Frequency (GHz)");

    g = svg.append("g")
        .attr('id', 'y-axis')
        .attr('transform', 'translate(' + margin.left + ',0)')
        .call(yAxis)
    g = svg.append("text")             
        .attr("transform", "translate(" + margin.ylabel + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Line sensitivity (mJy/beam)");

    // draw the CS graph
    drawCSPoints(plot_cs)   
}

export function updateFreqHistogramAxis(plot_properties, plot_cs)
{
    // get the new plot's properties
    minF = plot_properties.min_frequency
    maxF = plot_properties.max_frequency
    console.log(minF)
    console.log(minF)
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens
    // update the axis (with animations!)
    xScale.domain([minF, maxF])
    yScale.domain([maxC, minC])
    
    svg.select("#x-axis").transition().duration(2000).call(xAxis)
    svg.select("#y-axis").transition().duration(2000).call(yAxis)
    
    // redraw the CS graph
    drawCSPoints(plot_cs)
}

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
            .attr("y", function() { return margin.top})
            .attr("width", function(w) { return (xScale(w.end) - xScale(w.start))})
            .attr("height", height-margin.bottom-margin.top)
            .attr("stroke-width", 0)
            .attr("fill", "#000000")
            .attr("opacity", 0.1)
        })
    }
}

function drawCSPoints(plot_cs)
{
    console.log(yScale.domain())
    svg.selectAll('path').remove()

    var cs_line = d3.line()
        .defined(function(d) { return d.cs != null })
        .x(function(d) { return xScale(d.freq)})
        .y(function(d) { return yScale(d.cs)})

    svg.append('path')
        //.data([plot_cs].filter(cs_line.defined()))
        .attr('class', 'line')
        .attr('d', cs_line(plot_cs))
}

