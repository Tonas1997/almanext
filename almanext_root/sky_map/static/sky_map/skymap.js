var width = $("#skymap").innerWidth()
var height = $("#skymap").innerHeight()
const margin = {bottom: 50, left: 50, top: 50, right: 50}

var svg
var xScale, xAxis, yScale, yAxis, rScale, plot_svg, x_svg, y_svg
var scaleExtent = [1, 1000]
var x = 150, y = 30, r = 40
var lodLevels = 0
var clusterData = []

var transform_store

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
        .domain([0, 3000])
        .range([0, 30])

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
          .attr("r", 40)
          .style("fill", "#68b2a1")

    const extent = [[0, 0], [width, height]];

    plot_svg.call(d3.zoom()
        .scaleExtent(scaleExtent)
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", zoomed))

    $.ajax(    
        {
            url: $("#url-div-clusters").data('url'),
            data_type: 'json',
            success: function(data) {
                clusterData = JSON.parse(data)
                lodLevels = Object.keys(clusterData).length
                zoomed()
            }
        }
    )
}

function zoomed()
{
    if(d3.event != null)
        transform_store = d3.event.transform
    else
        transform_store = d3.zoomIdentity
    // create new scale ojects based on event
    var new_xScale = transform_store.rescaleX(xScale);
    var new_yScale = transform_store.rescaleY(yScale);

    renderVisibleClusters(new_xScale, new_yScale)
    // update axes
    x_svg.selectAll("#x-axis").call(xAxis.scale(new_xScale));
    y_svg.selectAll("#y-axis").call(yAxis.scale(new_yScale));
}

function renderVisibleClusters(new_xScale, new_yScale)
{
    var k = transform_store.k
    var min_ra = new_xScale.domain()[0]
    var max_ra = new_xScale.domain()[1]
    var min_dec = new_yScale.domain()[0]
    var max_dec = new_yScale.domain()[1]
    var level = getLODByZoom(k)
    console.log(level)
    var lod_data = clusterData["lod" + level]
    
    var filtered_lod_data = lod_data.filter(c => c.ra > min_ra && c.ra < max_ra &&  
        c.dec > min_dec && c.dec < max_dec)

    plot_svg.selectAll('circle').remove()

    plot_svg.selectAll('circle')
        .data(filtered_lod_data)
        .enter()
        .append('circle')
            .attr("type", "static")
            .attr("cx", function(f) { return new_xScale(f.ra)})
            .attr("cy", function(f) { return new_yScale(f.dec)})
            .attr("r", function(f) { return calcRadius(f)})
            .style("fill", level != 0 ? "#373755" : "#cc0000")
            .style('opacity', function(f) {
                var r = calcRadius(f)
                return ((parseFloat(d3.select(this).attr("cx")) - r < margin.left) || 
                        (parseFloat(d3.select(this).attr("cy")) + r > height - margin.bottom)) ? 0.1 : 0.7
                })

        function calcRadius(o)
        {
            return level != 0 ? rScale(o.n_obs)*k : 5
        }
}

function getLODByZoom(x)
{
    var k = 0.02
    // a logistic function that has been tuned for a reasonable transition between lods
    return Math.max(Math.round(-(2*lodLevels)/(1 + Math.E ** (-k * (x - 1))) + 2 * lodLevels - 1), 0)
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