var width = $('#plot-cs').width();
var height = $('#plot-cs').height();
var ratio = width / (115 - 85)
var margin = 5
var padding_bottom = 30;

var svg, xScale, xAxis, yScale, yAxis, g

var colorScale;

export function showCSHistogram(minF, maxF, minCS, maxCS)
{
    width = $('#info-second-row').width();
    height = $('#info-second-row').height();
    ratio = width / (maxF - minF)
    margin = 5;

    console.log(minF)
    console.log(maxF)

    // we are appending SVG first
    svg = d3.select("#info-second-row")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        //.style("margin", margin);
    
    xScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([0, width - 20]);
    
    xAxis = d3.axisBottom()
        .scale(xScale)

    yScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([0, height - 20]);
    
    yAxis = d3.axisLeft()
        .scale(yScale)   

    g = svg.append("g")
        .attr('transform', 'translate(0 ' + (height-padding_bottom) + ')')
        .call(xAxis)

    g = svg.append("g")
        .call(yAxis)
    
}