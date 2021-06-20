var width = $("#skymap").innerWidth()
var height = $("#skymap").innerHeight()
const margin = {bottom: 50, left: 50, top: 50, right: 50}

var svg
var xScale, xAxis, yScale, yAxis, rScale, oScale, plot_svg, x_svg, y_svg
var scaleExtent = [1, 2000]
var x = 150, y = 30, r = 40
var lodLevels = 0
var clusterData = []

var radiusMultiplier = 1.0
var varRadius = "n_obs"
var varOpacity = "fixed"

var transform_store = d3.zoomIdentity
var currLevel

// the minimum zoom level observations are displayed at
const L0_ZOOM = 100
const R_RANGE = 30

$(function() 
{
    createSkymap()
    loadSkymapData()
})

function createSkymap()
{
    // right ascension
    xScale = d3.scaleLinear()
        .domain([0, 360])
        .range([0, width]);
    xAxis = d3.axisBottom()
        .scale(xScale)

    // declination
    yScale = d3.scaleLinear()
        .domain([-90, 90])
        .range([height, 0])
    yAxis = d3.axisLeft() 
        .scale(yScale)

    // radius
    rScale = d3.scaleSqrt()
        .range([0, R_RANGE])

    // opacity
    oScale = d3.scaleSqrt()
        .range([0, 1])

    // this svg will contain the datapoints
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

    // right ascension axis
    x_svg.append("g")
        .attr('id', 'x-axis')
        .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
        .call(xAxis)
    x_svg.append("text")             
        .attr("transform", "translate(" + (width/2) + "," + (height - margin.bottom + 30) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Right ascension");

    // declination axis
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

    // set the panning limits
    const extent = [[0, 0], [width, height]];

    plot_svg.call(d3.zoom()
        .scaleExtent(scaleExtent)
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", zoomed))

    initializeControls()
}

function updateScales()
{
    rScale.domain([0, d3.max(clusterData["lod" + (lodLevels - 1)], function(d) { return d[varRadius] })])
    oScale.domain([0, d3.max(clusterData["lod" + (lodLevels - 1)], function(d) { return d[varOpacity] })])
}

function loadSkymapData()
{
    $.ajax(    
        {
            url: $("#url-div-clusters").data('url'),
            data_type: 'json',
            success: function(data) {
                clusterData = JSON.parse(data)
                lodLevels = Object.keys(clusterData).length
                updateScales()
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
    if(new_xScale == undefined && new_yScale == undefined)
    {
        new_xScale = xScale
        new_yScale = yScale
    }
    var k = transform_store.k
    var min_ra = new_xScale.domain()[0]
    var max_ra = new_xScale.domain()[1]
    var min_dec = new_yScale.domain()[0]
    var max_dec = new_yScale.domain()[1]
    currLevel = getLODByZoom(k)
    console.log(k)
    var lod_data = clusterData["lod" + currLevel]
    
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
            .style("fill", currLevel != 0 ? "#373755" : "#cc0000")
            .style('opacity', function(f) { return calcOpacity(f, new_xScale, new_yScale)})
            
}

function calcRadius(o)
{
    return currLevel != 0 ? rScale(o[varRadius]) * transform_store.k * radiusMultiplier : 5
}

function calcOpacity(o, xScale, yScale)
{
    var r = calcRadius(o)
    if ((parseFloat(xScale(o.ra)) - r < margin.left) || (parseFloat(yScale(o.dec)) + r > height - margin.bottom))
        return 0.1
    else if (currLevel == 0 || varOpacity == "fixed")
        return 0.7
    else
        return oScale(o[varOpacity])
}

function getLODByZoom(k)
{
    // a logarithmic function that has been tuned for a reasonable transition between lods
    var n = Math.ceil(getBaseLog(0.5, (k/L0_ZOOM)))
    return Math.max(Math.min(n, lodLevels - 1), 0)
}

function getBaseLog(base, x) 
{
    return Math.log(x) / Math.log(base);
  }

function initializeControls()
{
    $("#opt-clustersize").selectmenu(
    {
        change: function(event, ui)
        {
            varRadius = ui.item.value
            updateScales()
            plot_svg.selectAll('circle').transition().attr('r', d => calcRadius(d))
            console.log(rScale.domain())
        }
    })

    $("#opt-clusteropacity").selectmenu(
    {
        change: function(event, ui)
        {
            varOpacity = ui.item.value
            updateScales()
            plot_svg.selectAll('circle').transition().style('opacity', d => calcOpacity(d, xScale, yScale))
        }
    }).addClass("no-scroll")
    
    $("#opt-clustersize-scale").slider(
    {
        min: 0.1, 
        max: 10,  
        value:[1],
        step: 0.1,
        slide: function(event, ui) 
        {
            radiusMultiplier = ui.value
            plot_svg.selectAll('circle').transition().attr('r', d => calcRadius(d))
        }
    })
}

function drawClusters(data)
{

}