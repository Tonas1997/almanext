// plot rendering variables
const plot_margin = {top: 0, right: 0, bottom: 0, left: 0};
var plot_width = $('#plot').height();
var plot_height = $('#plot').width();

// color legend variables
const plot_scale_size = {width: '90%', height: 10, radius: 5};
var plot_scale_svg;

// dataset variables
var pixel_len;
var pixel_array
var observation_array
var plot_properties

// interface variables
export var plot_canvas_chart
var context;
var plot_transform_store;
var plot_color_scale = {scale: null, worst: 0, best: 0, ref: 0};
var plot_axis_label;

// TODO
var plot_ui_options = {render_mode: "count_pointings", pixel_tooltip: false, highlight_overlap: false}
var selected_observations = []

export function updatePlotSelectedObs(obs_list)
{
    selected_observations = obs_list
    updateHighlightedPixels()
}

export function setRenderMode(mode)
{
    plot_ui_options.render_mode = mode
}

// ------------------- CODE -------------------

function updateDataset(plot_json)
{
    console.log("fire")

    var overlap_area = 0;
    var total_area = 0;
    // Plot info

    pixel_len = plot_json.properties.pixel_len
    total_area = plot_json.properties.total_area
    overlap_area = plot_json.properties.overlap_area

    console.log("createArray")
    pixel_array = createArray(pixel_len, pixel_len)
    observation_array = new Array(plot_json.observations.length)

    // Init Canvas
    $('.canvas-plot').remove();
    plot_canvas_chart = d3.select('#plot').append('canvas').classed('canvas_chart', true)
        .attr('width', plot_width)
        .attr('height', plot_height)
        .style('margin-left', plot_margin.left + 'px')
        .style('margin-top', plot_margin.top + 'px')
        .style('z-index', 0)
        .style('height', document.getElementById('plot').offsetHeight)
        .attr('class', 'canvas-plot');

    context = plot_canvas_chart.node().getContext('2d');

    // fill canvas with a default background color
    context.beginPath();
    context.fillStyle = d3.interpolateViridis(0);
    context.fillRect( 0, 0, context.canvas.width, context.canvas.height );

    var observations = plot_json.observations
    var dataset = plot_json.pixels
    console.log(observations.length)
    // Copy observations
    console.log("copy observations")
    for (var i = 0; i < observations.length; i++) 
    {
        observation_array[i] = observations[i]
    }

    console.log("copy pixels")

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
    console.log("updateCanvas")
    updateCanvas(d3.zoomIdentity)

    // zoom event
    d3.select(context.canvas).call(d3.zoom()
        .scaleExtent([1,15])
        .translateExtent([[0,0],[plot_width,plot_width]])
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

    console.log("returning")
    return plot_properties
}

// Plot external API
export function updateCanvas(transform)
{
    console.log("updateCanvas start")
    // differentiates between zoom and plot colour update
    if(transform != undefined)
    {
        //transform = d3.zoomIdentity.translate(0,0).scale(1)
        plot_transform_store = transform
    }

    var inverse // this will later help us define the direction of the scale's gradient

    switch(plot_ui_options.render_mode)
    {
        case "count_pointings":
            //plot_color_scale.scale = function(value) {return d3.interpolateViridis(value)};
            plot_color_scale.worst = plot_properties.min_count_pointings
            plot_color_scale.best = plot_properties.max_count_pointings
            plot_color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateViridis)
                .domain([plot_color_scale.worst,plot_color_scale.best]);
            plot_axis_label = ""
            inverse = false
            break
        case "avg_res":
            //plot_color_scale.scale = function(value) {return d3.interpolateInferno(Math.abs(1-value))};
            plot_color_scale.worst = plot_properties.max_avg_res
            plot_color_scale.best = plot_properties.min_avg_res
            plot_color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateInferno)
                .domain([plot_color_scale.worst,plot_color_scale.best]);
            plot_axis_label = "arcsec2"
            inverse = true
            break
        case "avg_sens":
            //plot_color_scale.scale = function(value) {return d3.interpolateYlGnBu(value)};
            plot_color_scale.worst = plot_properties.max_avg_sens
            plot_color_scale.best = plot_properties.min_avg_sens
            plot_color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateYlGnBu)
                .domain([plot_color_scale.best,plot_color_scale.worst]);
            plot_axis_label = "mJy/beam"
            inverse = true
            break
        case "avg_int_time":
            //plot_color_scale.scale = function(value) {return d3.interpolateCividis(value)};
            plot_color_scale.worst = plot_properties.min_avg_int_time
            plot_color_scale.best = plot_properties.max_avg_int_time
            plot_color_scale.scale = d3.scaleSequential()
                .interpolator(d3.interpolateCividis)
                .domain([plot_color_scale.worst,plot_color_scale.best]);
            plot_axis_label = "seconds"
            inverse = false
            break
        case "cs_comb":
            var fieldname
            switch($("#cs-histogram-array").val())
            {
                case "12m":
                    fieldname = "cs_comb_12m"
                    plot_color_scale.best = plot_properties.max_combined_cs_12m
                    break
                case "7m":
                    fieldname = "cs_comb_7m"
                    plot_color_scale.best = plot_properties.max_combined_cs_7m
                    break
                case "tp":
                    fieldname = "cs_comb_tp"
                    plot_color_scale.best = plot_properties.max_combined_cs_tp
                    break
            }
            plot_color_scale.worst = 0//plot_properties.min_combined_cs
            plot_color_scale.scale = d3.scaleDiverging()
                .interpolator(d3.interpolateRdYlGn)
                .domain([plot_color_scale.worst, 1, plot_color_scale.best]);
            plot_axis_label = "factor (combined sensitivity)"
            inverse = false
            break
    }

    var ref = plot_color_scale.ref
    var scale = plot_color_scale.scale
    context.save()
    context.fillStyle = "#FFFFFF" //plot_color_scale(background)
    context.fillRect( 0, 0, context.canvas.width, context.canvas.height );

    context.translate(plot_transform_store.x, plot_transform_store.y)
    context.scale(plot_transform_store.k, plot_transform_store.k)

    var pixelScale = plot_width / pixel_len
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
                if(plot_ui_options.render_mode == "cs_comb")
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
                    context.fillStyle = scale(point[plot_ui_options.render_mode])
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
                if(plot_ui_options.highlight_overlap)
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
    if(plot_scale_svg != null)
    {
        //plot_scale_svg.selectAll('*').remove();
        $("#plot-color-scale").empty()
    }

    plot_scale_svg = d3.select('#plot-color-scale')
        .attr('width', '100%')
        .attr('height', '100%')
    
    // defines the direction of the gradient
    var min, max
    if(!inverse) { min = '0%'; max = '100%' }
    else { min = '100%'; max = '0%' }

    var gradient = plot_scale_svg.append('defs')
        .append('linearGradient')
        .attr('id', 'gradient')
        .attr('x1', min) // left
        .attr('y1', '0%')
        .attr('x2', max) // right
        .attr('y2', '0%')
        .attr('spreadMethod', 'pad');

    var start = inverse? plot_color_scale.best : plot_color_scale.worst
    var end = inverse? plot_color_scale.worst : plot_color_scale.best
    if(end == start)
    {
        gradient.append('stop')
            .attr('offset', Math.round(i/end * 100) + "%")
            .attr('stop-color', plot_color_scale.scale(i))
            .attr('stop-opacity', 1);
    }
    else
    {
        var step = (end-start)/10
        for(var i = start; i <= end; i += step)
        {
            gradient.append('stop')
                .attr('offset', Math.round(i/end * 100) + "%")
                .attr('stop-color', plot_color_scale.scale(i))
                .attr('stop-opacity', 1);
        }
    }

    var left_margin = ($("#plot-color-scale")).width() * 0.1 / 2

    plot_scale_svg.append('rect')
        .attr('id', 'colorscale')
        .attr('x', left_margin)
        .attr('y', 0)
        .attr('width', plot_scale_size.width)
        .attr('height', plot_scale_size.height)
        .attr('rx', plot_scale_size.radius)
        .attr('ry', plot_scale_size.radius)
        .attr('left', '5%')
        .style('fill', 'url(#gradient)');

    plot_scale_svg.append("text")             
        .attr("transform", "translate(" +  ($("#plot-color-scale")).width()/2 + ", " + 40 +")")
        .style("font-size", "11px")
        .style("text-anchor", "middle")
        .text(plot_axis_label);

    var legendScale = d3.scaleLinear()
        .domain([plot_color_scale.worst, plot_color_scale.best])
        .range([0, $("#colorscale").width()]);

    var legendAxis = d3.axisBottom()
        .scale(legendScale)

    plot_scale_svg.append("g")
        .attr("transform", "translate(" + left_margin + ", " + plot_scale_size.height + ")")
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
    var trueX = plot_transform_store.invertX(mouseX);
    var trueY = plot_transform_store.invertY(mouseY);

    var pixelWidth = (plot_width / pixel_len)
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

        if(plot_ui_options.pixel_tooltip)
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
                        <button id="btn-tooltip" class="plot-button" title=""><i class="fas fa-comment-alt plot-button-icon" aria-hidden="true"></i></button>
                        <button id="btn-overlap" class="plot-button" title=""><i class="fas fa-dot-circle plot-button-icon" aria-hidden="true"></i></button>
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
        plot_ui_options.pixel_tooltip = !plot_ui_options.pixel_tooltip
        if(plot_ui_options.pixel_tooltip)
            d3.select('#plot-tooltip').style("display", "block");
        else
            d3.select('#plot-tooltip').style("display", "none");
    }))

    // defines the "highlight overlapping observations" behaviour
    $('#btn-overlap').on('click', (function() {
        plot_ui_options.highlight_overlap = !plot_ui_options.highlight_overlap
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