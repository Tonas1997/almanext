import
{
    renderData, // initial render
    updateCanvas, // plot update
    getPixelInfo, // gets the selected pixel
    setHighlightOverlap, // sets a given plot option
    canvas_chart, // canvas object
    setRenderMode
} from "./plot.js"

import
{
    showFreqHistogram, // initial render
    updateFreqHistogram,
    updateFreqHistogramAxis // plot update
} from "./freq_histogram.js"

// ========================================================
// =================== STATE VARIABLES ====================
// ========================================================

var is_rendered_freq_histogram = false

// ========================================================
// ============== PLOT PARAMETERS MANAGEMENT ==============
// ========================================================

var parameters = {}
/**
 * Gets the bands that have been selected
 */
function getBands()
{
    var band_list = []
    for (var i = 3; i < 11; i++)
    {
        var element_id = "#formfield_band" + i
        if($(element_id).is(":checked"))
            band_list.push(i)
    }
    console.log(band_list)
    return band_list
}

/**
 * Validates the plot parameters
*/
function checkParams()
{
    var error = false

    parameters = {
        ra: parseFloat($("#formfield_ra").val()),
        dec: parseFloat($("#formfield_dec").val()),
        size: parseFloat($("#formfield_size").val()),
        bands: getBands(),
        redshift: parseFloat($("#formfield_redshift").val()),
        res: parseFloat($("#formfield_res").val())
    }
    // check for the RA value
    if(isNaN(parameters.ra))
    {
        // handle error
        console.log("RA!")
        error = true
    }
    // check for the Dec value
    if(isNaN(parameters.dec))
    {
        // handle error
        console.log("Dec!")
        error = true
    }
    // check for the size value
    if(isNaN(parameters.size))
    {
        // handle error
        console.log("Size!")
        error = true
    }
    // check if the user selected at least one band
    if(parameters.bands.length == 0)
    {
        // handle error
        console.log("Bands!")
        error = true
    }
    // check for the resolution value
    if(isNaN(parameters.res))
    {
        // handle error
        console.log("Res!")
        error = true
    }
    // return null if there's a faulty argument, the arg list otherwise
    if(error)
        return null
    else
        return parameters
}

/**
 * Initializes the tab behaviour for the plot information area
 */
$(function() {
    $("#infotabs").tabs();
});

/**
 * Sets the plot mode
 */
$("#plot-color-property").on('change', (function() {
    setRenderMode(this.value)
}))

/**
 * Toggles the "highlight overlapping regions" option
 */
$('#highlightOverlap').on('change', (function() {
    setHighlightOverlap(this.checked)
}))


/**
 * Defines the behaviour of the "render" submit button
 */
$("#form-plot").on('submit', function(event)
{
    event.preventDefault()
    // check parameters
    var data = checkParams()
    if(data == null)
    {
        return;
    }   
    else
    {
        console.log(parameters)
        $.ajax(    
            {
                url: '/get_plot/',
                data: parameters,
                data_type: 'json',
                success: function(data) {
                    initializePlotView(JSON.parse(data))
                }
            }
        )
    }
});

// ========================================================
// ================= PLOT USER INTERFACE ==================
// ========================================================

/**
 * Initializes a new plot view and its associated visualization tools
 * @param {*} data The JSON data that has been obtained
 */
function initializePlotView(data)
{
    //alert('success!')
    var plot_properties = renderData(data)
    var plot_cs = data.continuum_sensitivity        

    initializePlotInfo(plot_properties)
    
    if(!is_rendered_freq_histogram)
    {
        console.log(plot_properties)
        showFreqHistogram(plot_properties, plot_cs)
        is_rendered_freq_histogram = true
    }
    else if(data.observations.length != 0)
    {
        updateFreqHistogramAxis(plot_properties, plot_cs)
    }

    canvas_chart.on("mousemove",function()
    {
        var info = getPixelInfo(d3.mouse(this));
        // update pixel info
        if(info != null)
        {
            document.getElementById('pixel-ra').innerHTML = info.ra
            document.getElementById('pixel-dec').innerHTML = info.dec
            document.getElementById('pixel-n-pointings').innerHTML = info.count_pointings
            document.getElementById('pixel-avg-res').innerHTML = info.avg_res
            document.getElementById('pixel-avg-sens').innerHTML = info.avg_sens
            document.getElementById('pixel-avg-int-time').innerHTML = info.avg_int_time
            updateFreqHistogram(info.obs)
        }
        else
        {
            var nan = "--.--"
            document.getElementById('pixel-ra').innerHTML = nan
            document.getElementById('pixel-dec').innerHTML = nan
            document.getElementById('pixel-n-pointings').innerHTML = nan
            document.getElementById('pixel-avg-res').innerHTML = nan
            document.getElementById('pixel-avg-sens').innerHTML = nan
            document.getElementById('pixel-avg-int-time').innerHTML = nan
            updateFreqHistogram(null)
        }
    });

    $("#plot-color-property").on('change', (function() {
        setRenderMode(this.value)
        updateCanvas()
    }))

    $('#highlightOverlap').on('change', (function() {
        setHighlightOverlap(this.checked)
        updateCanvas()
    }))
}

/**
 * Creates or updates the plot information display
 * @param {*} plot_properties The properties object
 */
function initializePlotInfo(plot_properties)
{
    console.log(plot_properties)
    document.getElementById('plot-total-area').innerHTML = "~" + plot_properties.total_area
    document.getElementById('plot-overlap-area').innerHTML = "~" + plot_properties.overlap_area
    document.getElementById('plot-overlap-area-pct').innerHTML = "~" + (plot_properties.overlap_area/plot_properties.total_area*100).toFixed(2)
}