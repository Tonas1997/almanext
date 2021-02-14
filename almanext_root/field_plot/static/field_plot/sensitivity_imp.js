var width, height
var margin = {left: 50, right: 40, top: 10, bottom: 15, xLabel: 25, yLabel: 15}
var xScale, xAxis, yScale, yAxis, svg, g, clip
var histogram, bins_best, bins_comb

var resolution
const N_BUCKETS = 100

export function showSensitivityPlot(plot_properties, plot_pixels)
{
    resolution = plot_properties.resolution
    document.getElementById("tab-gained-sensitivity").innerHTML = getPaneHTML()

    width = $('#info-row').width() * 0.7;
    height = $('#info-row').height() - 95;

    xScale = d3.scaleLog()
        .domain(
            [
                d3.min(plot_pixels.map(function(d) { return Math.min(d.cs_comb, d.cs_best)})), 
                d3.max(plot_pixels.map(function(d) { return Math.max(d.cs_comb, d.cs_best)}))
            ])
        .range([margin.left, width - margin.right]);

    xAxis = d3.axisBottom()
        .scale(xScale)
        .ticks(3)

    // left scale - default: number of observations per frequency
    yScale = d3.scaleSymlog()
        .domain([0, 10])
        .range([height - margin.bottom - margin.top, 0])
    yAxis = d3.axisLeft() 
        .scale(yScale)

    svg = d3.select("#cs-histogram")
        .append("svg")
        .attr("width", width)
        .attr("height", height + margin.bottom)
        .attr("display", "block")
        .style("margin-top", margin.top)
    
    g = svg.append("g")
        .attr('id', 'x-axis')
        .attr('transform', 'translate(0,' + (height-margin.bottom) + ')')
        .call(xAxis)
    g = svg.append("text")             
        .attr("transform", "translate(" + (width/2) + " ," + (height - margin.bottom + margin.xLabel) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Sensitivity");

    // left Y axis
    g = svg.append("g")
        .attr('id', 'y-axis')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(yAxis.tickFormat(d3.format(".1e")))
    g = svg.append("text")         
        .attr("transform", "translate(" + margin.yLabel + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Number of pixels");

    /*clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip1")
        .append("svg:rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left)
        .attr("y", margin.top);*/

    updateSensitivityPlot(plot_pixels)

}

function updateSensitivityPlot(plot_pixels)
{
    var h1 = d3.histogram().value(d => d.cs_best).domain(xScale.domain()).thresholds(N_BUCKETS)
    var h2 = d3.histogram().value(d => d.cs_comb).domain(xScale.domain()).thresholds(N_BUCKETS)

    bins_best = h1(plot_pixels).filter(p => p.length > 0)
    bins_comb = h2(plot_pixels).filter(p => p.length > 0)
    console.log(bins_best)
    console.log(bins_comb)

    var maxYBest = d3.max(bins_best, function(d) { return getBinArea(d.length); })
    var maxYComb = d3.max(bins_comb, function(d) { return getBinArea(d.length); })
    
    yScale.domain([0, Math.max(maxYBest, maxYComb)])
    yAxis.scale(yScale)
    svg.select("#y-axis").transition().duration(2000).call(yAxis)

    console.log(xScale.domain())

    svg.selectAll("rect")
        .data(bins_best)
        .enter()
        .append("rect")
            .attr("x", function(d) { return xScale(d.x0)})
            .attr("y", function(d) { return yScale(getBinArea(d.length)) + margin.top})
            .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0); })
            .attr("height", function(d) { return height - margin.top - margin.bottom - yScale(getBinArea(d.length)); })
            .attr("class", "bar-cont-best")

    svg.selectAll("rect2")
        .data(bins_comb)
        .enter()
        .append("rect")
            .attr("x", function(d) { return xScale(d.x0)})
            .attr("y", function(d) { return yScale(getBinArea(d.length)) + margin.top})
            .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0); })
            .attr("height", function(d) { return height - margin.top - margin.bottom - yScale(getBinArea(d.length)); })
            .attr("class", "bar-cont-comb")
}

function getBinArea(length)
{
    return length*(resolution**2/1.296e7)
}

function getPaneHTML()
{
    return `
    <div id='tab-gained-sensitivity-wrapper'>
        <div id='cs-plot-left'>
            <div id='cs-plot-info'>
            </div>
        </div>
        <div class='sep-vertical'></div>
        <div id='cs-plot-right'>
            <div id='cs-histogram'>
            </div>
            <div class='histogram-controls-wrapper '>
            asd
            </div>
        </div>
    </div>`
}