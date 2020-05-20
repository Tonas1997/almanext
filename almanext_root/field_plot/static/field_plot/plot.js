const pointColor = '#3585ff'

const margin = {top: 0, right: 0, bottom: 0, left: 0};
var outerWidth = $('#plot').height();
var outerHeight = $('#plot').width();
var width = outerWidth - margin.left - margin.right;
var height = outerHeight - margin.top - margin.bottom;
const container = d3.select('#plot');

class Observation
{
    constructor(project_code, frequency)
    {
        this.project_code = project_code
        this.frequency = frequency
    }
}

// Pixel class
class Pixel
{
    constructor(x, y, ra, dec, count_obs, avg_res, avg_sens, avg_int_time, observations)
    {
        this.x = x;
        this.y = y;
        this.ra = ra;
        this.dec = dec;
        this.count_obs = count_obs;
        this.avg_res = avg_res;
        this.avg_sens = avg_sens;
        this.avg_int_time = avg_int_time;
        this.observations = observations
    }
}

class CanvasProperty
{
    constructor(data, size, res)
    {
        this.data = data
        this.size = size
        this.res = res
        this.pixel_len = size*3600/res
    }
}

var pixel_len

class Transform
{
    constructor(x, y, k)
    {
        this.x = x
        this.y = y
        this.k = k
    }
}

var overlap_area = 0;
var total_area = 0;

var max_count_obs = 0
var max_avg_res = 0
var max_avg_sens = 0
var max_avg_int_time = 0
var max_coords = []

export var canvas_chart
var transform_store;
var context;

var pixel_array
var observation_array

var selectBox = document.getElementById("plot-color-property")

// ------------------- CODE -------------------

function updateDataset(plot_json)
{
    console.log("fire")

    overlap_area = 0;
    total_area = 0;
    // Plot info

    pixel_array = createArray(plot_json.pixel_len, plot_json.pixel_len)
    observation_array = new Array(plot_json.data.observations.length)
    //console.log(document.getElementById('plot').width);

    // Init Canvas
    canvas_chart = container.append('canvas').classed('canvas_chart', true)
        .attr('width', width)
        .attr('height', height)
        .style('margin-left', margin.left + 'px')
        .style('margin-top', margin.top + 'px')
        .style('z-index', 0)
        .style('height', document.getElementById('plot').offsetHeight)
        .attr('class', 'canvas-plot');

    context = canvas_chart.node().getContext('2d');

    // fill canvas with a default background color
    context.beginPath();
    context.fillStyle = d3.interpolateViridis(0);
    context.fillRect( 0, 0, context.canvas.width, context.canvas.height );

    max_count_obs = 0
    max_avg_res = 0
    max_avg_sens = 0
    max_avg_int_time = 0
    max_coords = []

    var observations = plot_json.data.observations
    var dataset = plot_json.data.pixels
    // Copy observations
    for (var i = 0; i < observations.length; i++) {
            observation_array[i] = new Observation(
            observations[i].project_code,
            observations[i].frequency)
    }

    // Copy pixels
    for (var i = 0; i < dataset.length; i++) {
        // This is where the fun begins :)

        // get the point
        var point = dataset[i]
        
        // fill the pixel "cache" array with this pixel's info
        if(point.x < plot_json.pixel_len)
        {
            pixel_array[point.x][point.y] = new Pixel(
                parseFloat(point.x), 
                parseFloat(point.y), 
                parseFloat(point.RA), 
                parseFloat(point.Dec),
                parseInt(point.count_obs),
                parseFloat(point.avg_res),
                parseFloat(point.avg_sens),
                parseFloat(point.avg_int_time),
                point.observations
            );
        }

        total_area += Math.pow(plot_json.res, 2);
        // if it has more than one observation covering it, add to the acc variable
        if(point.count_obs > 1)
        {
            overlap_area += Math.pow(plot_json.res, 2);
        }

        if(point.count_obs > max_count_obs)  max_count_obs = point.count_obs;
        if(point.avg_res > max_avg_res)  max_avg_res = point.avg_res;
        if(point.avg_sens > max_avg_sens)  max_avg_sens = point.avg_sens;
        if(point.avg_int_time > max_avg_int_time)  max_avg_int_time = point.avg_int_time;
        //drawPoint(point);
    }

    // initial render
    updateCanvas(d3.zoomIdentity)

    // zoom event
    d3.select(context.canvas).call(d3.zoom()
        .scaleExtent([1,15])
        .translateExtent([[0,0],[width,width]])
        .on("zoom", () => updateCanvas(d3.event.transform)));

    return {
        "total_area": total_area,
        "overlap_area": overlap_area,
        "overlap_area_pct": (overlap_area/total_area*100).toFixed(2)
    }
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

    var pixel_info = selectBox.options[selectBox.selectedIndex].value
    var colorScale
    var max_pixel_info_value

    switch(pixel_info)
    {
        case "count_obs":
            colorScale = function(value) {return d3.interpolateViridis(value)};
            max_pixel_info_value = max_count_obs
            break
        case "avg_res":
            colorScale = function(value) {return d3.interpolateInferno(value)};
            max_pixel_info_value = max_avg_res
            break
        case "avg_sens":
            colorScale = function(value) {return d3.interpolateBlues(Math.abs(1-value))};
            max_pixel_info_value = max_avg_sens
            break
        case "avg_int_time":
            colorScale = function(value) {return d3.interpolateCividis(value)};
            max_pixel_info_value = max_avg_int_time
            break
    }

    context.save()
    context.fillStyle = colorScale(0)
    context.fillRect( 0, 0, context.canvas.width, context.canvas.height );

    context.translate(transform_store.x, transform_store.y)
    context.scale(transform_store.k, transform_store.k)

    var pixelScale = width / pixel_len
    context.beginPath();
    for(var i = 0; i < pixel_array.length; i++)
        for(var j = 0; j < pixel_array[i].length; j++)
        {
            var point = pixel_array[i][j]
            if(point != null)
            {
                const px = point.x
                const py = point.y

                context.beginPath()
                context.fillStyle = colorScale(point[pixel_info]/max_pixel_info_value);
                context.fillRect( py*pixelScale, px*pixelScale, 1*pixelScale, 1*pixelScale);
            }
        }
    //context.fill()
    context.restore();
}

export function renderData(data, size, res)
{   
    var plot_json = new CanvasProperty(JSON.parse(data), size, res)
    pixel_len = plot_json.pixel_len
    return updateDataset(plot_json)
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
        return {
            "ra": pixel.ra.toFixed(2),
            "dec": pixel.dec.toFixed(2),
            "count_obs": pixel.count_obs,
            "avg_res": pixel.avg_res.toFixed(2),
            "avg_sens": pixel.avg_sens.toFixed(2),
            "avg_int_time": pixel.avg_int_time.toFixed(2),
            "obs": observation_array[pixel.observations[0]].frequency
        }
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