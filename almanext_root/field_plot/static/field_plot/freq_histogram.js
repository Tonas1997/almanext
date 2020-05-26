var width = $('#pixel-freq').width();
var height = $('#pixel-freq').height();
var ratio = width / (115 - 85)
var margin = 5;
var padding_bottom = 30;

var svg, xScale, yScale, xAxis, yAxis, g

var colorScale;

export function showFreqHistogram(minF, maxF, minSens, maxSens)
{
    width = $('#pixel-freq').width();
    height = $('#pixel-freq').height();
    ratio = width / (maxF - minF)
    margin = 5;

    console.log(minSens)
    console.log(maxSens)

    // we are appending SVG first
    svg = d3.select("#pixel-freq")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        //.style("margin", margin);
    
    xScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([0, width - 20]);

    colorScale = d3.scaleLinear()
        .domain([minSens, maxSens])
        .range([0, 1])
    
    xAxis = d3.axisBottom()
        .scale(xScale)

    svg.append("g")
        .attr('transform', 'translate(0 ' + (height-padding_bottom) + ')')
        .call(xAxis)
    
}

var scale = 1

export function updateFreqHistogram(observations, max_val)
{
    console.log(observations)
    svg.selectAll('rect').remove()

    if(observations != null)
    {
        console.log("======================================")
        svg.selectAll('rect')
        .data(observations)
        .enter()
        .each(function(o) {
            console.log("=============")
            console.log(o)

            svg.selectAll('asd')
            .data(o.freq_windows)
            .enter()
            .append('rect')
            .attr("x", function(w) { return xScale(w.start)})
            .attr("y", function() { return height - (scale*height) - padding_bottom})
            .attr("width", function(w) { return (w.end - w.start) * ratio})
            .attr("height", height*scale)
            .attr("stroke-width", 0)
            .attr("fill", "#373755")
            .attr("opacity", function(w) { 
                console.log(colorScale.domain())
                return (colorScale(w.sensitivity_10kms))})
        })
    }
}

