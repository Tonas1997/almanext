// plot rendering variables
const plot_margin = {top: 0, right: 0, bottom: 0, left: 0};
var outerWidth = $('#plot').height();
var outerHeight = $('#plot').width();
var width = outerWidth - plot_margin.left - plot_margin.right;
var height = outerHeight - plot_margin.top - plot_margin.bottom;
const container = d3.select('#plot');

// color legend variables
const scale_margin = {top: 0, right: 0, bottom: 0, left: 0};
const scale_size = {height: 10, radius: 5};
var scaleSvg;

// data variables
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

var highlight_overlap = false
var render_mode = "count_pointings"

export function setHighlightOverlap(bool)
{
    highlight_overlap = bool
}

export function setRenderMode(mode)
{
    render_mode = mode
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
    //console.log(document.getElementById('plot').width);

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
    }

    // initial render
    plot_properties = plot_json.properties
    updateCanvas(d3.zoomIdentity)

    // zoom event
    d3.select(context.canvas).call(d3.zoom()
        .scaleExtent([1,15])
        .translateExtent([[0,0],[width,width]])
        .on("zoom", () => updateCanvas(d3.event.transform)));

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

    switch(render_mode)
    {
        case "count_pointings":
            color_scale.scale = function(value) {return d3.interpolateViridis(value)};
            color_scale.worst = plot_properties.min_count_pointings
            color_scale.best = plot_properties.max_count_pointings
            color_scale.ref = plot_properties.max_count_pointings
            inverse = false
            background = 0
            break
        case "avg_res":
            color_scale.scale = function(value) {return d3.interpolateInferno(Math.abs(1-value))};
            color_scale.worst = plot_properties.max_avg_res
            color_scale.best = plot_properties.min_avg_res
            color_scale.ref = plot_properties.max_avg_res
            inverse = true
            background = 1
            break
        case "avg_sens":
            color_scale.scale = function(value) {return d3.interpolateYlGnBu(value)};
            color_scale.worst = plot_properties.max_avg_sens
            color_scale.best = plot_properties.min_avg_sens
            color_scale.ref = plot_properties.max_avg_sens
            inverse = true
            background = 1
            break
        case "avg_int_time":
            color_scale.scale = function(value) {return d3.interpolateCividis(value)};
            color_scale.worst = plot_properties.min_agv_int_time
            color_scale.best = plot_properties.max_avg_int_time
            color_scale.ref = plot_properties.max_avg_int_time
            inverse = false
            background = 0
            break
        case "snr":
            color_scale.scale = function(value) {return d3.interpolateGreys(Math.abs(1-value))};
            color_scale.worst = plot_properties.min_snr
            color_scale.best = plot_properties.max_snr
            color_scale.ref = plot_properties.max_snr
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
                context.fillStyle = scale(point[render_mode]/ref);
                if(point.count_pointings == 1 && highlight_overlap)
                    context.globalAlpha = 0.1
                else
                    context.globalAlpha = 1.0
                context.fillRect( py*pixelScale, px*pixelScale, 1*pixelScale, 1*pixelScale);
            }
        }
    
    updateColorScale(inverse)
    context.restore();
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
    //.append('g')
      //  .attr('id', 'group')
    
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

    for(var i = 0; i <= 1; i += 0.1)
    {
        gradient.append('stop')
            .attr('offset', Math.round(i * 100) + "%")
            .attr('stop-color', color_scale.scale(i))
            .attr('stop-opacity', 1);
    }

    scaleSvg.append('rect')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('width', '100%')
        .attr('height', scale_size.height)
        .attr('rx', scale_size.radius)
        .attr('ry', scale_size.radius)
        .style('fill', 'url(#gradient)');

    var legendScale = d3.scaleLinear()
        .domain([color_scale.worst, color_scale.best])
        .range([0, $("#plot-color-scale").width()]);

    var legendAxis = d3.axisBottom()
        .scale(legendScale)

    scaleSvg.append("g")
        .attr("transform", "translate(0, " + scale_size.height + ")")
        .call(legendAxis);
}

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
    
    if(pixel != 0)
    {
        var result
        if(highlight_overlap && pixel.count_pointings == 1)
            result = null
        else
            var result = {
                "ra": pixel.ra.toFixed(2),
                "dec": pixel.dec.toFixed(2),
                "count_pointings": pixel.count_pointings,
                "avg_res": pixel.avg_res.toFixed(2),
                "avg_sens": pixel.avg_sens.toFixed(2),
                "avg_int_time": pixel.avg_int_time.toFixed(2),
                "snr": pixel.snr,
                "obs": getPixelObservation(pixel.observations)
            }
        return result
    }
    else
    {
        return null
    }
}    

// ------------------- AUXILIARY FUNCTIONS -------------------

// creates a double array
function createArray(length)
{
    var arr = Array(length).fill(0).map(x => Array(length).fill(0))
    return arr;
}

function getPixelObservation(px_observations)
{
    var windows = []

    for(var i = 0; i < px_observations.length; i++)
    {
        var observation = observation_array[px_observations[i]]
        var obs_code = observation.project_code
        var obs_windows = observation.frequency
        windows.push(
        {
            "project_code": obs_code,
            "freq_windows": obs_windows
        })
    }

    return windows
}