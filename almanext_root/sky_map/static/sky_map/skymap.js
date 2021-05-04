var width = $("#skymap").innerWidth()
var height = $("#skymap").innerHeight()
const margin = {bottom: 50, left: 50, top: 50, right: 50}

var svg
var xScale, xAxis, yScale, yAxis, plot_svg, x_svg, y_svg

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

    
}

function getSkymapData()
{

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