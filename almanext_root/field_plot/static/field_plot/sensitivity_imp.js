var width, height
var margin = {left: 50, right: 40, top: 10, bottom: 15, xLabel: 25, yLabel: 15}
var xScale, xAxis, yScale, yAxis, svg, g, drawArea
var transform_store

var resolution
const N_BUCKETS = 200
const ARRAY_CONFIG_DEFAULT = "12m"
const VAL_NULL = "--.--"

var SHOW_COMB = true
var SHOW_BEST = true
var ARRAY_CONFIG

// average and deviation values
var avg_best, avg_comb_12m, avg_comb_7m, avg_comb_tp
var err_best, err_comb_12m, err_comb_7m, err_comb_tp

export function showSensitivityPlot(plot_properties, plot_pixels)
{
    resolution = plot_properties.resolution
    document.getElementById("tab-gained-sensitivity").innerHTML = getPaneHTML()

    width = $('#info-row').width() * 0.65;
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

    yScale = d3.scaleLinear()
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

    // BRUSH OR ZOOM? NOT SURE...
    
    svg.call(d3.zoom()
        .scaleExtent([1, 1000])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", () => zoomed(d3.event.transform)));
    
        /*
    svg.call(d3.brushX()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on("start brush"), () => getSelected())*/
    
    $("#cs-histogram-best").checkboxradio().prop('checked',true).checkboxradio('refresh');
    $("#cs-histogram-best").click(function() {
        SHOW_BEST = $(this).is(":checked")
        changeVisibleBars()
    })

    $("#cs-histogram-comb").checkboxradio().prop('checked',true).checkboxradio('refresh');
    $("#cs-histogram-comb").click(function() {
        SHOW_COMB = $(this).is(":checked")
        changeVisibleBars()
    })
    $("#cs-histogram-array").selectmenu()
    // behavior is defined on controller.js as it affects other page displays

    updateSensitivityPlot(plot_pixels)
}

export function updateSensitivityPlot(plot_pixels)
{
    // handle null values for any sensitivity field
    // this is the only way I can think of to sanitize this :/
    xScale.domain(
            [
                d3.min(plot_pixels.map(function(d) 
                {
                    var minXArray = [d.cs_comb_12m, d.cs_comb_7m, d.cs_comb_tp, d.cs_best].filter(e => e != null)
                    return Math.log(Math.min(...minXArray))
                })), 
                d3.max(plot_pixels.map(function(d) 
                { 
                    var maxXArray = [d.cs_comb_12m, d.cs_comb_7m, d.cs_comb_tp, d.cs_best].filter(e => e != null)
                    return Math.log(Math.max(...maxXArray))
                }))
            ])
    
    // generate histogram functions for all combined sensitivities
    var h_best      = d3.histogram().value(d => Math.log(d.cs_best)).domain(xScale.domain()).thresholds(N_BUCKETS)
    var h_comb_12m  = d3.histogram().value(d => Math.log(d.cs_comb_12m)).domain(xScale.domain()).thresholds(N_BUCKETS)
    var h_comb_7m   = d3.histogram().value(d => Math.log(d.cs_comb_7m)).domain(xScale.domain()).thresholds(N_BUCKETS)
    var h_comb_tp   = d3.histogram().value(d => Math.log(d.cs_comb_tp)).domain(xScale.domain()).thresholds(N_BUCKETS)

    /* filter empty bins - we also need to remove pixels which don't have a computed
    sensitivity for a given array configuration beforehand */

    var filtered_best   = plot_pixels.filter(d => d.cs_best != null)
    var filtered_12m    = plot_pixels.filter(d => d.cs_comb_12m != null)
    var filtered_7m     = plot_pixels.filter(d => d.cs_comb_7m != null)
    var filtered_tp     = plot_pixels.filter(d => d.cs_comb_tp != null)

    var bins_best       = h_best(filtered_best).filter(b => b.length > 0)
    var bins_comb_12m   = h_comb_12m(filtered_12m).filter(b => b.length > 0)
    var bins_comb_7m    = h_comb_7m(filtered_7m).filter(b => b.length > 0)
    var bins_comb_tp    = h_comb_tp(filtered_tp).filter(b => b.length > 0)

    avg_best        = d3.mean(filtered_best, f => f.cs_best)
    avg_comb_12m    = d3.mean(filtered_12m, f => f.cs_comb_12m)
    avg_comb_7m     = d3.mean(filtered_7m, f => f.cs_comb_7m)
    avg_comb_tp     = d3.mean(filtered_tp, f => f.cs_comb_tp)

    err_best        = d3.deviation(filtered_best, f => f.cs_best)
    err_comb_12m    = d3.deviation(filtered_12m, f => f.cs_comb_12m)
    err_comb_7m     = d3.deviation(filtered_7m, f => f.cs_comb_7m)
    err_comb_tp     = d3.deviation(filtered_tp, f => f.cs_comb_tp)

    // obtain the highest column among all bins
    var maxYBest    = d3.max(bins_best, function(d) { return d.length; })
    var maxYComb12  = d3.max(bins_comb_12m, function(d) { return d.length; }) 
    var maxYComb7   = d3.max(bins_comb_7m, function(d) { return d.length; }) 
    var maxYCombTP  = d3.max(bins_comb_tp, function(d) { return d.length; })

    var maxYArray = [maxYBest, maxYComb12, maxYComb7, maxYCombTP].filter(e => typeof e !== "undefined")

    console.log(maxYBest)
    console.log(maxYComb12)
    console.log(maxYComb7)
    console.log(maxYCombTP)
    
    yScale.domain([0, Math.max(...maxYArray)])
    xAxis.scale(xScale)
    yAxis.scale(yScale).ticks(3, "~s");
    
    /*
        Using a log scale is currently the only way to have properly spread-out tickmarks
        This is a temporary solution until scaleLog-like ticks are implemented for scaleSymlog
    */
    svg.select("#x-axis1").transition().duration(2000).call(xAxis)
    svg.select("#y-axis").transition().duration(2000).call(yAxis)

    console.log(xScale.domain())

    removeAllBins()

    appendBins(0, bins_best, "best", "bar-cont-best")
    appendBins(1, bins_comb_12m, "12m", "bar-cont-comb")
    appendBins(2, bins_comb_7m, "7m", "bar-cont-comb")
    appendBins(3, bins_comb_tp, "tp", "bar-cont-comb")
    
    // update the best average/deviation values
    $("#cs-best-avg").text(avg_best.toFixed(4))
    $("#cs-best-err").text(err_best.toFixed(4))
    changeVisibleBars(ARRAY_CONFIG_DEFAULT)
}

function removeAllBins()
{
    drawArea.selectAll("rect0").remove()
    drawArea.selectAll("rect1").remove()
    drawArea.selectAll("rect2").remove()
    drawArea.selectAll("rect3").remove()
}

function appendBins(id, bin_set, array, css_class)
{
    var selectTarget = "rect" + id
    drawArea.selectAll(selectTarget)
        .data(bin_set)
        .enter()
        .append("rect")
            .attr("array", array)
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

function getSelected()
{
    if(d3.event.selection != null)
    {
        var brush_coords = d3.brushedSelection(this)
        drawArea.selectAll(".bar-cont-comb")
        .filter(function() {
            var x0 = d3.select(this).attr("x")
            var x1 = d3.select(this).attr("x") + d3.select(this).attr("width")
            return (covers(brush_coords, x0, x1))
        })
    }

    function covers(coords, x0, x1) 
    {
        return ((coords[0] >= x1 && coords[0]) <= x0 ||
                (coords[0] <= x0 && coords[1]) >= x1 ||
                (coords[1] <= x1 && coords[1]) >= x1)
    }
}

// updates the visible combined sensitivity bars 
export function changeVisibleBars(array_id)
{
    // if this method was triggered by changing the array configuration, change it!
    if(array_id != undefined)
    { 
        ARRAY_CONFIG = array_id
        switch(ARRAY_CONFIG)
        {
            case "12m":
            {
                if(avg_comb_12m != undefined)
                {
                    $("#cs-comb-avg").text(avg_comb_12m.toFixed(4))
                    $("#cs-comb-err").text(err_comb_12m.toFixed(4))
                }
                else
                {
                    $("#cs-comb-avg").text(VAL_NULL)
                    $("#cs-comb-err").text(VAL_NULL)
                }
                break;
            }
            case "7m" :
            {

                if(avg_comb_7m != undefined)
                {
                    $("#cs-comb-avg").text(avg_comb_7m.toFixed(4))
                    $("#cs-comb-err").text(err_comb_7m.toFixed(4))
                }
                else
                {
                    $("#cs-comb-avg").text(VAL_NULL)
                    $("#cs-comb-err").text(VAL_NULL)
                }
                break;
            }
            case "tp" :
            {
                if(avg_comb_tp != undefined)
                {
                    $("#cs-comb-avg").text(avg_comb_tp.toFixed(4))
                    $("#cs-comb-err").text(err_comb_tp.toFixed(4))
                }
                else
                {
                    $("#cs-comb-avg").text(VAL_NULL)
                    $("#cs-comb-err").text(VAL_NULL)
                }
                break;
            }
        }
        $(".cs-comb-array").text(ARRAY_CONFIG)
    }
    // are the combined sensitivity bars toggled?
    if(SHOW_COMB)
    {
        drawArea.selectAll(".bar-cont-comb")
            .filter(function() {
                var array = d3.select(this).attr("array")
                return (array != ARRAY_CONFIG)
            })
            .transition().duration(200).style("opacity", 0.0)
        drawArea.selectAll(".bar-cont-comb")
            .filter(function() {
                var array = d3.select(this).attr("array")
                return (array == ARRAY_CONFIG)
            })
            .transition().duration(200).style("opacity", 0.5)
    }
    else
    {
        drawArea.selectAll(".bar-cont-comb").transition().duration(200).style("opacity", 0.0)
    }
    // update the average/error values for the chosen array configuration
    // are the best sensitivity bars toggled?
    if(SHOW_BEST)
    {
        drawArea.selectAll(".bar-cont-best")
            .filter(function() {
                var array = d3.select(this).attr("array")
                return (array == "best")
            })
            .transition().duration(200).style("opacity", 0.5)
    }
    else
    {
        drawArea.selectAll(".bar-cont-best").transition().duration(200).style("opacity", 0.0)
    }
}

function getPaneHTML()
{
    return `
    <div id='tab-gained-sensitivity-wrapper'>
        <div id='cs-plot-left'>
            <div id='cs-plot-info'>
                <div class='pane-frame'>
                    <div class='info-wrapper'>
                        <div class='value-box compact'><div class='value-box field label'>Average best</div>
                            <div class='field value'><div id='cs-best-avg'>--.--</div>&nbsp mJy</div></div>
                        <div class='value-box compact'><div class='value-box field label'>Std. error best</div>
                            <div class='field value'><div id='cs-best-err'>--.--</div></div></div>
                        <div class='value-box compact'><div class='value-box field label'>Average combined&nbsp(<span class='cs-comb-array'></span>)</div>
                            <div class='field value'><div id='cs-comb-avg'>--.--</div>&nbsp mJy</div></div>
                        <div class='value-box compact'><div class='value-box field label'>Std. error combined&nbsp(<span class='cs-comb-array'></span>)</div>
                            <div class='field value'><div id='cs-comb-err'>--.--</div></div></div>
                    </div>
                </div>
            </div>
        </div>
        <div class='sep-vertical'></div>
        <div id='cs-plot-right'>
            <div id='cs-histogram'>
            </div>
            <div class='histogram-controls-wrapper'>
                <div class='histogram-control'>
                    <span class='text-label'>Best sensitivity</span>
                    <input type="checkbox" name="checkbox-1" id="cs-histogram-best">
                    <label for="cs-histogram-best" class="checkbox-clean"></label>
                </div>
                <div class='histogram-control'>
                    <span class='text-label'>Combined sensitivity</span>
                    <input type="checkbox" name="checkbox-1" id="cs-histogram-comb">
                    <label for="cs-histogram-comb" class="checkbox-clean"></label>
                </div>
                <div class='histogram-control'>
                    <span class='text-label'>Array</span> 
                    <select id='cs-histogram-array'>
                        <option value='12m'>12m (long baselines)</option>
                        <option value='7m'>7m (compact array)</option>
                        <option value='tp'>Total power (LB + ACA)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>`
}