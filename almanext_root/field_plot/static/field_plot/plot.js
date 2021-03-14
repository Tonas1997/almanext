// plot rendering variables
const plot_margin = {top: 0, right: 0, bottom: 0, left: 0};
var outerWidth = $('#plot').height();
var outerHeight = $('#plot').width();
var width = outerWidth - plot_margin.left - plot_margin.right;
var height = outerHeight - plot_margin.top - plot_margin.bottom;
const container = d3.select('#plot');

// color legend variables
const scale_size = {width: '90%', height: 10, radius: 5};
var scaleSvg;

// dataset variables
var pixel_len;
var overlap_area;
var total_area;

var pixel_array
var observation_array
var plot_properties

// interface variables
export var canvas_chart
var transform_store;
var context;
var color_scale = {scale: null, worst: 0, best: 0, ref: 0};
var axis_label;
var filter_list = [];

// TODO
var options = {render_mode: "count_pointings", pixel_tooltip: false}
var highlight_overlap = false
var selected_observations = []


export function addFilter(filter_id, argument)
{   
    //console.log('========== ADD ==========')
    console.log('filter_id: ' + filter_id + ' argument: ' + argument)
    var new_filter = new PlotFilter(filter_id, argument)
    filter_list.push(new_filter)
    updateFilters()
    updateCanvas()
    console.log(filter_list)
}

export function removeFilter(filter_id, argument)
{
    //console.log('========== REM ==========')
    console.log('filter_id: ' + filter_id + ' argument: ' + argument)
    // these filters have to be always destroyed
    filter_list = filter_list.filter(function(plot_filter) 
    {
        return !(plot_filter.id == filter_id && plot_filter.arg == argument)
    });
    updateFilters()
    updateCanvas()
    console.log(filter_list)
}

export function updatePlotSelectedObs(obs_list)
{
    selected_observations = obs_list
    updateHighlightedPixels()
}

export function setRenderMode(mode)
{
    options.render_mode = mode
}

// ------------------- CODE -------------------

function updateDataset(plot_json)
{
    console.log("fire")

    overlap_area = 0;
    total_area = 0;
    // Plot info

    pixel_len = plot_json.properties.pixel_len
    total_area = plot_json.properties.total_area
    overlap_area = plot_json.properties.overlap_area

    pixel_array = createArray(pixel_len, pixel_len)
    observation_array = new Array(plot_json.observations.length)

    // Init Canvas
    canvas_chart = container.append('canvas').classed('canvas_chart', true)
        .attr('width', width)
        .attr('height', height)
        .style('margin-left', plot_margin.left + 'px')
        .style('margin-top', plot_margin.top + 'px')
        .style('z-index', 0)
        .style('height', document.getElementById('plot').offsetHeight)
        .attr('class', 'canvas-plot');

    context = canvas_chart.node().getContext('2d');

    // fill canvas with a default background color
    context.beginPath();
    context.fillStyle = d3.interpolateViridis(0);
    context.fillRect( 0, 0, context.canvas.width, context.canvas.height );

    var observations = plot_json.observations
    var dataset = plot_json.pixels
    // Copy observations
    for (var i = 0; i < observations.length; i++) 
    {
        observation_array[i] = observations[i]
    }

    // Copy pixels
    for (var i = 0; i < dataset.length; i++) {
        // This is where the fun begins :)

        // get the point
        var point = dataset[i]
        
        // fill the pixel "cache" array with this pixel
        if(point.x < pixel_len)
        {
            pixel_array[point.x][point.y] = point    
        }
        point.highlight = true
    }

    // initial render
    plot_properties = plot_json.properties
    updateCanvas(d3.zoomIdentity)

    // zoom event
    d3.select(context.canvas).call(d3.zoom()
        .scaleExtent([1,15])
        .translateExtent([[0,0],[width,width]])
        .on("zoom", () => updateCanvas(d3.event.transform)))
        .on("dblclick.zoom", null);

    $("#plot").tooltip({
        content: "coiso",
        position: { my: "left-10 center", at: "right center" },
        classes: 
        {
            "ui-tooltip": "plot-button-tooltip"
        }
    });

    return plot_properties
}

// Plot external API
export function updateCanvas(transform)
{
    // differentiates between zoom and plot colour update
    if(transform != undefined)
    {
        //transform = d3.zoomIdentity.translate(0,0).scale(1)
        transform_store = transform
    }

    var background
    var inverse // this will later help us define the direction of the scale's gradient
    var pixel_value // allows us to define more complex calculations vs. just reading a field

    switch(options.render_mode)
    {
        case "count_pointings":
            //color_scale.scale = function(value) {return d3.interpolateViridis(value)};
            color_scale.worst = plot_properties.min_count_pointings
            color_scale.best = plot_properties.max_count_pointings
            color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateViridis)
                .domain([color_scale.worst,color_scale.best]);
            axis_label = ""
            inverse = false
            background = 0
            break
        case "avg_res":
            //color_scale.scale = function(value) {return d3.interpolateInferno(Math.abs(1-value))};
            color_scale.worst = plot_properties.max_avg_res
            color_scale.best = plot_properties.min_avg_res
            color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateInferno)
                .domain([color_scale.worst,color_scale.best]);
            axis_label = "arcsec2"
            inverse = true
            background = 1
            break
        case "avg_sens":
            //color_scale.scale = function(value) {return d3.interpolateYlGnBu(value)};
            color_scale.worst = plot_properties.max_avg_sens
            color_scale.best = plot_properties.min_avg_sens
            color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateYlGnBu)
                .domain([color_scale.best,color_scale.worst]);
            axis_label = "mJy/beam"
            inverse = true
            background = 1
            break
        case "avg_int_time":
            //color_scale.scale = function(value) {return d3.interpolateCividis(value)};
            color_scale.worst = plot_properties.min_avg_int_time
            color_scale.best = plot_properties.max_avg_int_time
            color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateCividis)
                .domain([color_scale.worst,color_scale.best]);
            axis_label = "seconds"
            inverse = false
            background = 0
            break
        case "cs_comb":
            var fieldname
            switch($("#cs-histogram-array").val())
            {
                case "12m":
                    fieldname = "cs_comb_12m"
                    color_scale.best = plot_properties.max_combined_cs_12m
                    break
                case "7m":
                    fieldname = "cs_comb_7m"
                    color_scale.best = plot_properties.max_combined_cs_7m
                    break
                case "tp":
                    fieldname = "cs_comb_tp"
                    color_scale.best = plot_properties.max_combined_cs_tp
                    break
            }
            color_scale.worst = 0//plot_properties.min_combined_cs
            color_scale.scale = d3.scaleDiverging()
                .interpolator(d3.interpolateRdYlGn)
                .domain([color_scale.worst, 1, color_scale.best]);
            axis_label = "factor (combined sensitivity)"
            inverse = false
            background = 0
            break
    }

    var ref = color_scale.ref
    var scale = color_scale.scale
    context.save()
    context.fillStyle = "#FFFFFF" //color_scale(background)
    context.fillRect( 0, 0, context.canvas.width, context.canvas.height );

    context.translate(transform_store.x, transform_store.y)
    context.scale(transform_store.k, transform_store.k)

    var pixelScale = width / pixel_len
    context.beginPath();
    for(var i = 0; i < pixel_array.length; i++)
        for(var j = 0; j < pixel_array[i].length; j++)
        {
            var point = pixel_array[i][j]
            if(point != 0)
            {
                const px = point.x
                const py = point.y

                context.beginPath()
                // the coloring for the combined sensitivity is a bit more complex...
                if(options.render_mode == "cs_comb")
                {
                    // paint the pixel grey if it's not covered by the selected array configuration
                    if(point[fieldname] == null)
                    {
                        context.fillStyle = "#ededed"
                    }
                    else
                    {
                        context.fillStyle = scale(point["cs_best"]/point[fieldname])
                    }
                }
                else
                {
                    context.fillStyle = scale(point[options.render_mode])
                }
                point.highlight ? context.globalAlpha = 1.0 : context.globalAlpha = 0.1 
                context.fillRect( py*pixelScale, px*pixelScale, 1*pixelScale, 1*pixelScale);
            }
        }
    
    updateColorScale(inverse)
    context.restore();
}

function updateHighlightedPixels()
{
    console.log(selected_observations)
    var px_overlap
    var px_observations
    for(var i = 0; i < pixel_array.length; i++)
        for(var j = 0; j < pixel_array[i].length; j++)
        {
            var point = pixel_array[i][j]
            if(point != 0)
            {
                px_overlap = true
                px_observations = true
                // if the pixel has more than one pointing and overlap highlighting is toggled
                if(highlight_overlap)
                    px_overlap = point.count_pointings > 1
                // if there's at least one selected observation, check if this pixel covers it
                // I deserve a lower grade for using labels...
                // TODO 
                id_1: if(selected_observations.length > 0)
                {
                    for(var o in selected_observations)
                    {
                        if(point.observations.includes(selected_observations[o]))
                            break id_1
                    }
                    px_observations = false
                }
                point.highlight = px_overlap && px_observations
            }
        }
    updateCanvas()
}

function updateColorScale(inverse)
{
    if(scaleSvg != null)
    {
        //scaleSvg.selectAll('*').remove();
        $("#plot-color-scale").empty()
    }

    scaleSvg = d3.select('#plot-color-scale')
        .attr('width', '100%')
        .attr('height', '100%')
    
    // defines the direction of the gradient
    var min, max
    if(!inverse) { min = '0%'; max = '100%' }
    else { min = '100%'; max = '0%' }

    var gradient = scaleSvg.append('defs')
        .append('linearGradient')
        .attr('id', 'gradient')
        .attr('x1', min) // left
        .attr('y1', '0%')
        .attr('x2', max) // right
        .attr('y2', '0%')
        .attr('spreadMethod', 'pad');

    var start = inverse? color_scale.best : color_scale.worst
    var end = inverse? color_scale.worst : color_scale.best
    var step = (end-start)/10
    for(var i = start; i <= end; i += step)
    {
        gradient.append('stop')
            .attr('offset', Math.round(i/end * 100) + "%")
            .attr('stop-color', color_scale.scale(i))
            .attr('stop-opacity', 1);
    }

    var left_margin = ($("#plot-color-scale")).width() * 0.1 / 2

    scaleSvg.append('rect')
        .attr('id', 'colorscale')
        .attr('x', left_margin)
        .attr('y', 0)
        .attr('width', scale_size.width)
        .attr('height', scale_size.height)
        .attr('rx', scale_size.radius)
        .attr('ry', scale_size.radius)
        .attr('left', '5%')
        .style('fill', 'url(#gradient)');

    scaleSvg.append("text")             
        .attr("transform", "translate(" +  ($("#plot-color-scale")).width()/2 + ", " + 40 +")")
        .style("font-size", "11px")
        .style("text-anchor", "middle")
        .text(axis_label);

    var legendScale = d3.scaleLinear()
        .domain([color_scale.worst, color_scale.best])
        .range([0, $("#colorscale").width()]);

    var legendAxis = d3.axisBottom()
        .scale(legendScale)

    scaleSvg.append("g")
        .attr("transform", "translate(" + left_margin + ", " + scale_size.height + ")")
        .call(legendAxis);
}

/**
 * Public function to expose the "render data" routine
 * @param {*} data The data that has been extracted from the JSON file
 */
export function renderData(data)
{   
    return updateDataset(data)
}

export function getPixelInfo(mouse)
{
    // get mouse position
    var mouseX = mouse[0];
    var mouseY = mouse[1];
    if(mouseX < 0 || mouseY < 0)
        return;
    // get grid position
    var element = document.getElementById("plot");
    var sizeString = getComputedStyle(element).width
    sizeString = sizeString.substring(0, sizeString.length - 2);

    // plot size in pixels
    // var size = parseFloat(sizeString);
    var trueX = transform_store.invertX(mouseX);
    var trueY = transform_store.invertY(mouseY);

    var pixelWidth = (outerWidth / pixel_len)
    var gridX = Math.floor(trueX / pixelWidth)
    var gridY = Math.floor(trueY / pixelWidth)
    var pixel = pixel_array[gridY][gridX]

    var fieldname = ""
    switch($("#cs-histogram-array").val())
    {
        case "12m":
            fieldname = "cs_comb_12m"
            break
        case "7m":
            fieldname = "cs_comb_7m"
            break
        case "tp":
            fieldname = "cs_comb_tp"
            break
    }

    if(pixel != 0)
    {
        var result
    
        var ra = pixel.ra
        var dec = pixel.dec
        var count_pointings = pixel.count_pointings
        var avg_res = pixel.avg_res
        var avg_sens = pixel.avg_sens
        var avg_int_time = pixel.avg_int_time
        var cs_best = pixel.cs_best
        var cs_comb = pixel[fieldname]

        if(options.pixel_tooltip)
            d3.select('#plot-tooltip')
                .attr('class', "pixel-tooltip")
                .style('top', mouseY + 5 + 'px')
                .style('left', mouseX + 5 + 'px')
                .style('display', 'block')
                .html('Right ascension: ' + ra.toFixed(2) + '<br>' + 
                    'Declination: ' + dec.toFixed(2) + '<br>' + 
                    'Number of pointings: ' + count_pointings + '<br>' + 
                    'Avg. resolution: ' + avg_res.toFixed(2) + '&nbsp arcsec<sup>2</sup><br>' + 
                    'Avg. sensitivity: ' + avg_sens.toFixed(2) + '&nbsp mJy/beam<br>' + 
                    'Avg. int. time: ' + avg_int_time.toFixed(2) + '&nbsp s<br>' + 
                    'Sensitivity (best): ' + cs_best.toExponential(3) + '&nbsp mJy/beam<br>' +
                    'Sensitivity (combined): ' + (cs_comb == null? "--.--" : pixel[fieldname].toExponential(3) + '&nbsp mJy/beam<br>'))  

        var result = {
            "ra": ra,
            "dec": dec,
            "count_pointings": count_pointings,
            "avg_res": avg_res,
            "avg_sens": avg_sens,
            "avg_int_time": avg_int_time,
            "cs_best" : cs_best,
            "cs_comb": cs_comb,
            "obs": getPixelObservations(pixel.observations)
        }
        
        return result
    }
    else
    {
        d3.select('#plot-tooltip').style("display", "none");
        return null
    }
}

export function showPlotControls()
{
    // Axis and color scale options
    $("#plot").append(`<div id="plot-control-axis" class="plot-control-hidden">
                        <select id="plot-color-property">
                            <option value="count_pointings">Pointings count</option>
                            <option value="avg_res">Average resolution</option>
                            <option value="avg_sens">Average sensitivity (10km/s)</option>
                            <option value="avg_int_time">Average integration time</option>
                            <option value="cs_comb">CS improvement factor</option>
                        </select>
                        <div id="plot-axis">
                            <svg id="plot-color-scale"></svg>
                        </div>     
                    </div>
                    <div id="plot-tooltip"></div>`)
    $("#plot-color-property").selectmenu(
    {
        change: function(event, ui)
        {
            setRenderMode(ui.item.value)
            updateCanvas()
        },
        position:
        {
            collision: "flip"
        }
    })

    $("#plot-color-property").on('change', (function() {
        setRenderMode(this.value)
    }))

    $("#plot").append(`<div id="plot-control-buttons">
                        <button id="btn-tooltip" class="plot-button" title="">X</button>
                        <button id="btn-overlap" class="plot-button" title="">X</button>
                    </div>`)

    $("#btn-tooltip").tooltip({
        content: "Toggle pixel tooltips",
        position: { my: "left-10 center", at: "right center" },
        classes: 
        {
            "ui-tooltip": "btn-tooltip"
        }
    });

    $("#btn-overlap").tooltip({
        content: "Toggle overlap highlight",
        position: { my: "left-10 center", at: "right center" },
        classes: 
        {
            "ui-tooltip": "btn-tooltip"
        }
    });

    $('#btn-tooltip').on('click', (function() {
        options.pixel_tooltip = !options.pixel_tooltip
        if(options.pixel_tooltip)
            d3.select('#plot-tooltip').style("display", "block");
        else
            d3.select('#plot-tooltip').style("display", "none");
    }))

    // defines the "highlight overlapping observations" behaviour
    $('#btn-overlap').on('click', (function() {
        highlight_overlap = !highlight_overlap
        updateHighlightedPixels()
    }))

    /*
    $("#btn-overlap").button({
        icons: {primary: 'ui-icon-custom', secondary: null}
    });
    document.getElementById("btn-overlap").innerHTML = '<img src="' + IMAGE_DIR + 'coiso.png"/>'*/
}

// ------------------- AUXILIARY FUNCTIONS -------------------

// creates a double array
function createArray(length)
{
    var arr = Array(length).fill(0).map(x => Array(length).fill(0))
    return arr;
}

function getPixelObservations(px_observations)
{
    var observations = []

    for(var i = 0; i < px_observations.length; i++)
    {
        var observation = observation_array[px_observations[i]]
        /*var obs_code = observation.project_code
        var obs_windows = observation.frequency
        windows.push(
        {
            "project_code": obs_code,
            "freq_windows": obs_windows
        })*/
        observations.push(observation)
    }

    return observations
}