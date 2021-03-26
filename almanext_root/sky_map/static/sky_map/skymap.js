var width = window.innerWidth()
var height = w / 2

var svg
var xScale, xAxis, yScale, yAxis


function createSkymap()
{
    xScale = d3.scaleLinear()
        .domain([0, 360])
        .range([0, width]);
    xAxis = d3.axisBottom()
        .scale(xScale)

    yScale = d3.scaleLinear()
        .domain([-90, 90])
        .range([height, 0])
    yAxis1 = d3.axisLeft() 
        .scale(yScale)

    svg = d3.select("#skymap")
        .append("svg")
        .attr("width", width)
        .attr("height", height + margin.bottom)
        .attr("display", "block")
}

function getSkymapData()
{

}