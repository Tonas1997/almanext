var width, height
var margin = {left: 50, right: 40, top: 10, bottom: 15, xLabel: 25, yLabel: 15}
var xScale, xAxis, yScale, yAxis, svg, g, drawArea
var bins_best, bins_comb
var transform_store

var resolution
const N_BUCKETS = 100

export function showSensitivityPlot(plot_properties, plot_pixels)
{
    resolution = plot_properties.resolution
    document.getElementById("tab-gained-sensitivity").innerHTML = getPaneHTML()

    width = $('#info-row').width() * 0.7;
    height = $('#info-row').height() - 95;

    xScale = d3.scaleLinear()
        .domain(
            [
                d3.min(plot_pixels.map(function(d) { return Math.min(d.cs_comb, d.cs_best)})), 
                d3.max(plot_pixels.map(function(d) { return Math.max(d.cs_comb, d.cs_best)}))
            ])
        .range([margin.left, width - margin.right]);

    xAxis = d3.axisBottom()
        .scale(xScale)

    yScale = d3.scaleLog()
        .domain([1, 10])
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
        .attr('id', 'x-axis1')
        .attr('transform', 'translate(0,' + (height-margin.bottom) + ')')
        .call(xAxis)
    g = svg.append("text")             
        .attr("transform", "translate(" + (width/2) + " ," + (height - margin.bottom + margin.xLabel) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("log(Sensitivity) [mJy/1 arcsec beam]");

    // left Y axis
    g = svg.append("g")
        .attr('id', 'y-axis')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(yAxis)
    g = svg.append("text")         
        .attr("transform", "translate(" + margin.yLabel + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Number of pixels");

    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip3")
        .append("svg:rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left)
        .attr("y", margin.top);
    
    drawArea = svg.append("g")
        .attr("clip-path", "url(#clip3)")
    
    const extent = [[margin.left, 0], [width - margin.right, 0]];

    transform_store = d3.zoomIdentity
    svg.call(d3.zoom()
        .scaleExtent([1, 1000])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", () => zoomed(d3.event.transform)));
    
    $("#cs-histogram-best").checkboxradio().prop('checked',true).checkboxradio('refresh');
    $("#cs-histogram-best").click(function() {
        if($(this).is(":checked"))
        {
            svg.selectAll(".bar-cont-best").transition().duration(500).style("opacity", 0.5)
        }
        else
        {
            svg.selectAll(".bar-cont-best").transition().duration(500).style("opacity", 0.0)
        }
    })

    $("#cs-histogram-comb").checkboxradio().prop('checked',true).checkboxradio('refresh');
    $("#cs-histogram-comb").click(function() {
        if($(this).is(":checked"))
        {
            svg.selectAll(".bar-cont-comb").transition().duration(500).style("opacity", 0.5)
        }
        else
        {
            svg.selectAll(".bar-cont-comb").transition().duration(500).style("opacity", 0.0)
        }
    })
    updateSensitivityPlot(plot_pixels)
}

export function updateSensitivityPlot(plot_pixels)
{
    xScale.domain(
            [
                d3.min(plot_pixels.map(function(d) { return Math.log(Math.min(d.cs_comb_12m, d.cs_comb_7m, d.cs_comb_tp, d.cs_best))})), 
                d3.max(plot_pixels.map(function(d) { return Math.log(Math.max(d.cs_comb_12m, d.cs_comb_7m, d.cs_comb_tp, d.cs_best))}))
            ])
    
    // generate histogram functions for all combined sensitivities
    var h_best      = d3.histogram().value(d => Math.log(d.cs_best)).domain(xScale.domain()).thresholds(N_BUCKETS)
    var h_comb_12m  = d3.histogram().value(d => Math.log(d.cs_comb_12m)).domain(xScale.domain()).thresholds(N_BUCKETS)
    var h_comb_7m   = d3.histogram().value(d => Math.log(d.cs_comb_7m)).domain(xScale.domain()).thresholds(N_BUCKETS)
    var h_comb_tp   = d3.histogram().value(d => Math.log(d.cs_comb_tp)).domain(xScale.domain()).thresholds(N_BUCKETS)

    // filter empty bins
    var bins_best       = h_best(plot_pixels).filter(p => p.length > 0)
    var bins_comb_12m   = h_comb_12m(plot_pixels).filter(p => p.length > 0)
    var bins_comb_7m    = h_comb_7m(plot_pixels).filter(p => p.length > 0)
    var bins_comb_tp    = h_comb_tp(plot_pixels).filter(p => p.length > 0)

    // obtain the highest column among all bins
    var maxYBest    = d3.max(bins_best, function(d) { return d.length; })
    var maxYComb12  = d3.max(bins_comb_12m, function(d) { return d.length; }) 
    var maxYComb7   = d3.max(bins_comb_7m, function(d) { return d.length; }) 
    var maxYCombTP  = d3.max(bins_comb_tp, function(d) { return d.length; }) 
    
    yScale.domain([1, Math.max(maxYBest, maxYComb12, maxYComb7, maxYCombTP)])
    xAxis.scale(xScale)
    yAxis.scale(yScale).ticks(3, "~s");
    
    /*
        Using a log scale is currently the only way to have properly spread-out tickmarks
        This is a temporary solution until scaleLog-like ticks are implemented for scaleSymlog
    */
    svg.select("#x-axis1").transition().duration(2000).call(xAxis)
    svg.select("#y-axis").transition().duration(2000).call(yAxis)

    console.log(xScale.domain())

    appendBins(0, bins_best, "bar-cont-best")
    appendBins(1, bins_comb_12m, "bar-cont-comb")
    //appendBins(2, bins_comb_7m, "bar-cont-comb")
    //appendBins(3, bins_comb_tp, "bar-cont-comb")
    /*
    drawArea.selectAll("rect").remove()
    drawArea.selectAll("rect")
        .data(bins_best)
        .enter()
        .append("rect")
            .attr("x", function(d) { return xScale(d.x0)})
            .attr("y", function(d) { return yScale(d.length) + margin.top})
            .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0); })
            .attr("height", function(d) { return height - margin.top - margin.bottom - yScale(d.length); })
            .attr("class", "bar-cont-best")

    drawArea.selectAll("rect2")
        .data(bins_comb)
        .enter()
        .append("rect")
            .attr("x", function(d) { return xScale(d.x0)})
            .attr("y", function(d) { return yScale(d.length) + margin.top})
            .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0); })
            .attr("height", function(d) { return height - margin.top - margin.bottom - yScale(d.length); })
            .attr("class", "bar-cont-comb")
            */
}

function appendBins(id, bin_set, css_class)
{
    var selectTarget = "rect" + id
    drawArea.selectAll(selectTarget)
        .data(bin_set)
        .enter()
        .append("rect")
            .attr("x", function(d) { return xScale(d.x0)})
            .attr("y", function(d) { return yScale(d.length) + margin.top})
            .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0); })
            .attr("height", function(d) { return height - margin.top - margin.bottom - yScale(d.length); })
            .attr("class", css_class)
}

function zoomed(transform)
{
    if(transform != undefined)
    {
        transform_store = transform
    }
    transform_store.rescaleX(xScale)
    drawArea.selectAll("rect")
        .attr("transform", "translate(" + transform_store.x+",0)scale(" + transform_store.k + ",1)")
    svg.selectAll("#x-axis1").call(xAxis.scale(transform_store.rescaleX(xScale)));
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
            <div class='histogram-controls-wrapper'>
                <div class='histogram-control'>
                    <span class='text-label'>Show best sensitivity</span>
                    <input type="checkbox" name="checkbox-1" id="cs-histogram-best">
                    <label for="cs-histogram-best" class="checkbox-clean"></label>
                </div>
                <div class='histogram-control'>
                    <span class='text-label'>Show combined sensitivity</span>
                    <input type="checkbox" name="checkbox-1" id="cs-histogram-comb">
                    <label for="cs-histogram-comb" class="checkbox-clean"></label>
                </div>
                
            </div>
        </div>
    </div>`
}