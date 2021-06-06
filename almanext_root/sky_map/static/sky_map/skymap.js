var width = $("#skymap").innerWidth()
var height = $("#skymap").innerHeight()
const margin = {bottom: 50, left: 50, top: 50, right: 50}

var svg
var xScale, xAxis, yScale, yAxis, rScale, plot_svg, x_svg, y_svg
var x = 150, y = 30, r = 40

$(function() 
{
    initializeControls()
    createSkymap()
})

function createSkymap()
{
    //setPlotDimensions()

    xScale = d3.scaleLinear()
        .domain([0, 360])
        .range([0, width]);
    xAxis = d3.axisBottom()
        .scale(xScale)

    yScale = d3.scaleLinear()
        .domain([-90, 90])
        .range([height, 0])
    yAxis = d3.axisLeft() 
        .scale(yScale)

    rScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 100])

    plot_svg = d3.select("#skymap")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("display", "block")

    var clipX = plot_svg.append("defs").append("svg:clipPath")
        .attr("id", "clipX")
        .append("svg:rect")
        .attr("width", width - margin.left * 2 - margin.right)
        .attr("height", margin.bottom * 2)
        .attr("x", margin.left * 2)
        .attr("y", height - margin.bottom * 2)

    var clipY = plot_svg.append("defs").append("svg:clipPath")
        .attr("id", "clipY")
        .append("svg:rect")
        .attr("width", margin.left * 2)
        .attr("height", height - margin.top - margin.bottom * 2)
        .attr("x", 0)
        .attr("y", margin.top)

    x_svg = plot_svg.append("g")
        .attr("clip-path", "url(#clipX)")
    y_svg = plot_svg.append("g")
        .attr("clip-path", "url(#clipY)")

    // right ascension
    x_svg.append("g")
        .attr('id', 'x-axis')
        .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
        .call(xAxis)
    x_svg.append("text")             
        .attr("transform", "translate(" + (width/2) + "," + (height - margin.bottom + 20) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Right ascension");

    // declination
    y_svg.append("g")
        .attr('id', 'y-axis')
        .attr('class', 'plot-axis')
        .attr('transform', 'translate(' + margin.left + ',0)')
        .call(yAxis)
    y_svg.append("text")
        .attr("id", "y-axis1-label")             
        .attr("transform", "translate(" + 20 + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Declination");

    plot_svg.append("circle")
          .attr("cx", xScale(x))
          .attr("cy", yScale(y))
          .attr("r", rScale(r))
          .style("fill", "#68b2a1")

    const extent = [[0, 0], [width, height]];

    plot_svg.call(d3.zoom()
        .scaleExtent([1, 1000])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", zoomed))

    getSkymapData()
}

function zoomed()
{
    var transform = d3.event.transform
    // create new scale ojects based on event
    var new_xScale = transform.rescaleX(xScale);
    var new_yScale = transform.rescaleY(yScale);


    // update axes
    x_svg.selectAll("#x-axis").call(xAxis.scale(transform.rescaleX(xScale)));
    y_svg.selectAll("#y-axis").call(yAxis.scale(transform.rescaleY(yScale)));
    
    plot_svg.selectAll("circle")
        .attr("transform", "translate(" + transform.x + "," + transform.y + ") scale(" + transform.k + ")")
        .transition().duration(100).style('opacity', function() {
            return (new_xScale(x) - transform.k*r < margin.left * 2 || new_yScale(y) + transform.k*r > height - margin.bottom * 2) ? 0.5 : 1.0})
}

function getVisibleClusters()

function getSkymapData()
{
    $.ajax(    
        {
            url: $("#url-div-clusters").data('url'),
            data_type: 'json',
            success: function(data) {
                console.log(JSON.parse(data))
            }
        }
    )
}

function initializeControls()
{
    $("#opt-clustersize").selectmenu(
    {
        change: function(event, ui)
        {}
    })

    $("#opt-clusteropacity").selectmenu(
    {
        change: function(event, ui)
        {}
    }).addClass("no-scroll")
    
    $("#opt-clustersize-scale").slider(
    {
        min: 0.1, 
        max: 10,  
        value:[1],
        step: 0.1,
        slide: function(event, ui) 
        {}
    })

    $("#opt-clusteropacity-scale").slider(
    {
        min: 0.1, 
        max: 10,  
        value:[1],
        step: 0.1,
        slide: function(event, ui) 
        {}
    })
}

function drawClusters(data)
{

}