var width = $("#area-by-freq").innerWidth()
var height = $("#area-by-freq").innerHeight()
const margin = {bottom: 30, left: 30, top: 5, right: 10}

var svg
var xScale, xAxis, yScale, yAxis, plot_svg, x_svg, y_svg
var x = 150, y = 30

$(function()
{
    drawAreaPlot()
})


function loadAreaPlot()
{
    drawAreaPlot()
    $.ajax(    
        {
            url: $("#url-div-area-per-freq").data('url'),
            data_type: 'json',
            success: function(data) {
                drawAreaPlot(data)
            }
        }
    )
}

function drawAreaPlot()
{
    xScale = d3.scaleLinear()
        .domain([85, 950])
        .range([0, width]);
    xAxis = d3.axisBottom()
        .scale(xScale)

    yScale = d3.scaleLinear()
        .domain([0, 10])
        .range([height, 0])
    yAxis = d3.axisLeft() 
        .scale(yScale)

    svg = d3.select("#area-by-freq")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("display", "block")

    var clipX = svg.append("defs").append("svg:clipPath")
        .attr("id", "clipX")
        .append("svg:rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", margin.bottom * 2)
        .attr("x", margin.left)
        .attr("y", height - margin.bottom)

    var clipY = svg.append("defs").append("svg:clipPath")
        .attr("id", "clipY")
        .append("svg:rect")
        .attr("width", margin.left * 2)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", 0)
        .attr("y", margin.top)

    var clipPlot = svg.append("defs").append("svg:clipPath")
        .attr("id", "clipPlot")
        .append("svg:rect")
        .attr("width", width - margin.right - margin.left)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left)
        .attr("y", margin.top)

    x_svg = svg.append("g")
        .attr("clip-path", "url(#clipX)")
    y_svg = svg.append("g")
        .attr("clip-path", "url(#clipY)")
    plot_svg = svg.append("g")
        .attr("clip-path", "url(#clipPlot)")

    // frequency
    x_svg.append("g")
        .attr('id', 'x-axis')
        .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
        .call(xAxis)
    x_svg.append("text")             
        .attr("transform", "translate(" + (width/2) + "," + (height - margin.bottom + 25) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Frequency");

    // area
    y_svg.append("g")
        .attr('id', 'y-axis')
        .attr('class', 'plot-axis')
        .attr('transform', 'translate(' + margin.left + ',0)')
        .call(yAxis)
    y_svg.append("text")
        .attr("id", "y-axis1-label")             
        .attr("transform", "translate(" + 10 + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Total area");

    /*plot_svg.call(d3.zoom()
        .scaleExtent([1, 1000])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", () => plot_svg.attr("transform", d3.event.transform)));*/

    $.ajax(    
        {
            url: $("#url-div-bands").data('url'),
            data_type: 'json',
            success: function(data) {
   
                drawBands(JSON.parse(data))
            }
        }
    )
}

function drawBands(bandsJSON)
{
    var bar_height = height - margin.top - margin.bottom
    var bands_g = plot_svg.selectAll("svg")
        .data(bandsJSON.bands)

    var rect = bands_g
        .enter()
        .append("svg")
        .attr("x", function(b) { return margin.left + xScale(b.start)})
        .attr("y", margin.top)
    rect.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", function(b) { return xScale(b.end) - xScale(b.start)})
        .attr("height", bar_height)
        .attr("class", "band-display")
    rect.append("text")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .attr("transform", function(b) { return "translate(" + (xScale(b.end) - xScale(b.start))/2 +  "," + bar_height/2 + ") rotate(270)"})
        .attr("class", "band-label")
        .text(function(b) { return "Band " + b.designation})
}