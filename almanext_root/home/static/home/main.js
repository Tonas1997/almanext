var width = $("#area-by-freq").innerWidth()
var height = $("#area-by-freq").innerHeight()
const margin = {bottom: 30, left: 50, top: 5, right: 10}

var svg
var xScale, xAxis, yScale, yAxis, plot_svg, bands_svg, x_svg, y_svg
var bucketSize, freqArray

var x = 150, y = 30

$(function()
{
    loadAreaPlot()
    loadArchiveInfo()
})

function loadArchiveInfo()
{
    $.ajax(    
        {
            url: $("#url-div-archive-info").data('url'),
            data_type: 'json',
            success: function(data) {
                console.log(data)
                showArchiveInfo(JSON.parse(data))
            }
        }
    )
}

function loadAreaPlot()
{
    $.ajax(    
        {
            url: $("#url-div-area-per-freq").data('url'),
            data_type: 'json',
            success: function(data) {
                console.log(data)
                drawAreaPlot(JSON.parse(data))
            }
        }
    )
}

function showArchiveInfo(data)
{
    var count_obs = data.info_count_obs
    var area_total = data.info_area_total
    var area_overlap = data.info_area_overlap
    let counter_1 = new countUp.CountUp('count_obs', count_obs);
    let counter_2 = new countUp.CountUp('area_total', area_total, 2);
    let counter_3 = new countUp.CountUp('area_overlap', area_overlap, 2);
    counter_1.start()
    counter_2.start()
    counter_3.start()
}

function drawAreaPlot(data)
{
    bucketSize = data.bucket_size
    freqArray = data.areas.filter(d => { return d.total_area > 0 })

    var minFreq = freqArray[0].freq
    var maxFreq = freqArray[freqArray.length - 1].freq
    var minArea = d3.min(freqArray, function(d) { return d.total_area })
    var maxArea = d3.max(freqArray, function(d) { return d.total_area })

    xScale = d3.scaleLinear()
        .domain([minFreq, maxFreq])
        .range([0, width]);
    xAxis = d3.axisBottom()
        .scale(xScale)

    yScale = d3.scaleLog()
        .domain([minArea, maxArea])
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
    bands_svg = svg.append("g")
        .attr("clip-path", "url(#clipPlot)")
        .attr("z-index", 100)
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
        .text("Total area (arcsec²)");

    $.ajax(    
        {
            url: $("#url-div-bands").data('url'),
            data_type: 'json',
            success: function(data) {
                drawBands(JSON.parse(data))
                drawAreaBars()
            }
        }
    )
}

function drawBands(bandsJSON)
{
    var bar_height = height - margin.top - margin.bottom
    var bands_g = bands_svg.selectAll("svg")
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

function drawAreaBars()
{
    var barSize = Math.abs(xScale(bucketSize) - xScale(0))

    plot_svg.selectAll("rect")
    .data(freqArray)
    .enter()
    .append("rect")
    .attr("x", function(f) { return margin.left + xScale(f.freq)})
    .attr("y", function(f) { return yScale(f.total_area)})
    .attr("width", barSize)
    .attr("height", function(f) { return height - yScale(f.total_area)})
    .attr("class", "bar-display")
    .on("mouseover", function() {
        plot_svg.selectAll("rect").transition().duration(100).attr("opacity", 0.1)
    })
    .on("mouseout", function() {
        plot_svg.selectAll("rect").transition().duration(100).attr("opacity", 1.0)
    })
}

