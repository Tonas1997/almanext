const pointColor = '#3585ff'

const margin = {top: 0, right: 0, bottom: 0, left: 0};
var outerWidth = $('#plot').height();
var outerHeight = $('#plot').width();
var width = outerWidth - margin.left - margin.right;
var height = outerHeight - margin.top - margin.bottom;
const container = d3.select('#plot');

class Observation
{
    constructor(project_code)
    {
        this.project_code = project_code
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

var transform_store;
var context;

var pixelData
var obsData

var selectBox = document.getElementById("plot-color-property")

// ------------------- CODE -------------------

function updateCanvas(transform)
{
    // reset button
    if(transform == undefined)
    {
        transform = d3.zoomIdentity.translate(0,0).scale(1)
    }
    // store the transform values
    transform_store = transform
    //console.log(transform_store)

    pixel_info = selectBox.options[selectBox.selectedIndex].value

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

    context.translate(transform.x, transform.y)
    context.scale(transform.k, transform.k)

    var pixelScale = width / pixel_len
    context.beginPath();
    for(var i = 0; i < pixelData.length; i++)
        for(var j = 0; j < pixelData[i].length; j++)
        {
            point = pixelData[i][j]
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

function updateDataset(plot_json)
{
    console.log("fire")
    selectedPixel = false;
    hidePixelInfo()

    overlap_area = 0;
    total_area = 0;
    // Plot info

    pixelData = createArray(plot_json.pixel_len, plot_json.pixel_len)
    obsData = new Array(plot_json.data.observations.length)
    //console.log(document.getElementById('plot').width);

    // Init Canvas
    const canvasChart = container.append('canvas').classed('canvasChart', true)
        .attr('width', width)
        .attr('height', height)
        .style('margin-left', margin.left + 'px')
        .style('margin-top', margin.top + 'px')
        .style('z-index', 0)
        .style('height', document.getElementById('plot').offsetHeight)
        .attr('class', 'canvas-plot');

    context = canvasChart.node().getContext('2d');

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
        obsData[i] = new Observation(observations[i].project_code)
    }

    // Copy pixels
    for (var i = 0; i < dataset.length; i++) {
        // This is where the fun begins :)

        // get the point
        var point = dataset[i]
        
        // fill the pixel "cache" array with this pixel's info
        if(point.x < plot_json.pixel_len)
        {
            pixelData[point.x][point.y] = new Pixel(
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
    updatePlotInfo()

    // zoom event
    d3.select(context.canvas).call(d3.zoom()
        .scaleExtent([1,15])
        .on("zoom", () => updateCanvas(d3.event.transform)));

    canvasChart.on("mousemove",function()
    {
        if(selectedPixel) return;
        var p = getPixel(d3.mouse(this));
        
        if(p != 0)
        {
            showPixelInfo(p);
        }
        else
        {
            hidePixelInfo();
        }
    });

    canvasChart.on("mousedown",function()
    {
        var p = getPixel(d3.mouse(this));
        if(p == null)
        {
            selectedPixel = false;
        }
        else
        {
            showPixelInfo(p);
            selectedPixel = true;
        }
    });

    function getPixel(mouse)
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
        size = parseFloat(sizeString);
        trueX = transform_store.invertX(mouseX);
        trueY = transform_store.invertY(mouseY);
        //trueX = (mouseX / transform_store.k) + (-transform_store.x / transform_store.k)
        //trueY = (mouseY / transform_store.k) + (-transform_store.y / transform_store.k)
        /* console.log("==============================")
        console.log("OFFSET X: " + -transform_store.x / transform_store.k)
        console.log("OFFSET y: " + -transform_store.y / transform_store.k)
        console.log("SCALE F.: " + transform_store.k)
        console.log("------------------------------")
        console.log("currX: " + mouseX)
        console.log("currY: " + mouseY)
        console.log("------------------------------")*/
        console.log("trueX: " + trueX)
        console.log("trueY: " + trueY)

        pixelWidth = (outerWidth / pixel_len)
        gridX = Math.floor(trueX / pixelWidth)
        gridY = Math.floor(trueY / pixelWidth)
        pixel = pixelData[gridY][gridX]
        return pixel

    }    

    // ================ AUX FUNCTIONS ================

    function updatePlotInfo()
    {
        document.getElementById('plot-total-area').innerHTML = "~" + total_area + " arcsec<sup>2</sup>"
        document.getElementById('plot-overlap-area').innerHTML = "~" + overlap_area +  " arcsec<sup>2</sup>"
        document.getElementById('plot-overlap-area-pct').innerHTML = "~" + (overlap_area/total_area*100).toFixed(2) + "%"
    }
}

function render_data(data, size, res)
{   
    plot_json = new CanvasProperty(JSON.parse(data), size, res)
    pixel_len = plot_json.pixel_len
    updateDataset(plot_json)
}

// Init SVG

// ------------------- AUXILIARY FUNCTIONS -------------------

function createArray(length) {
    /* var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    } */

    arr = a = Array(length).fill(0).map(x => Array(length).fill(0))
    return arr;
}

function showPixelInfo(p)
{
    project_codes = p.observations
    for(var i = 0; i < project_codes.length; i++)
    {
        console.log(obsData[i].project_code)
    }
    
    document.getElementById('coordinates').innerHTML =
        "<div class='value-box'>RA<br>" + 
            "<div class='value-box value'>" + p.ra.toFixed(2) + " deg</div></div>" + 
        "<div class='value-box'>Dec <br>" + 
            "<div class='value-box value'>" + p.dec.toFixed(2) + " deg</div></div>";
    document.getElementById('properties').innerHTML = 
        "<div class='value-box'>Number of observations " + 
            "<div class='value-box value'>" + p.count_obs.toFixed(0) + "</div></div>" + 
        "<div class='value-box'>Average resolution " + 
            "<div class='value-box value'>" + p.avg_res.toFixed(2) + " arcsec</div></div>" + 
        "<div class='value-box'>Average sensitivity " + 
            "<div class='value-box value'>" + p.avg_sens.toFixed(2) + " mJy/beam (10 km/s)</div></div>" + 
        "<div class='value-box'>Average int. time " + 
            "<div class='value-box value'>" + p.avg_int_time.toFixed(2) + " s</div></div>";
}

function hidePixelInfo()
{
    document.getElementById('coordinates').innerHTML =
        "<div class='value-box'>RA<br>" + 
            "<div class='value-box value'> --.-- deg</div></div>" + 
        "<div class='value-box'>Dec <br>" + 
            "<div class='value-box value'> --.-- deg</div></div>";
    document.getElementById('properties').innerHTML = 
        "<div class='value-box'>Number of observations " + 
            "<div class='value-box value'> -- </div></div>" + 
        "<div class='value-box'>Average resolution " + 
            "<div class='value-box value'> --.-- arcsec</div></div>" + 
        "<div class='value-box'>Average sensitivity " + 
            "<div class='value-box value'> --.-- mJy/beam (10 km/s)</div></div>" + 
        "<div class='value-box'>Average int. time " + 
            "<div class='value-box value'> --.-- s</div></div>";
}

