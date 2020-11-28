import
{
    addFilter, // add a filter
    removeFilter, // remove a filter
    renderData, // initial render
    updateCanvas, // plot update
    getPixelInfo, // gets the selected pixel
    canvas_chart, // canvas object
    setRenderMode
} from "./plot.js"

import
{
    showFreqHistogram, // initial render
    updateFreqHistogram, // plot update
    updateFreqHistogramAxis // plot update - change axis
} from "./freq_histogram.js"

import
{
    showObservationList, // initial render
    updateObservationList, // list update
    getObservationRowData // get row data
} from "./obs_list.js"

// ========================================================
// =================== STATE VARIABLES ====================
// ========================================================

var first_render = true
var table = null

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
    /**
     * ================== INITIALIZATION ==================
     */
    // defines some variables
    var plot_properties = renderData(data)
    var plot_cs = data.continuum_sensitivity        

    // initializes the HTML handles for the plot properties
    initializePlotInfo(plot_properties)
    
    // keeps duplicate plots from being rendered when the dataset is regenerated
    // TODO
    if(first_render)
    {
        showFreqHistogram(plot_properties, plot_cs)
        showObservationList(data) // not sure I want to initialize the table before getting the data... TODO
        first_render = false
    }
    else if(data.observations.length != 0)
    {
        updateFreqHistogramAxis(plot_properties, plot_cs)
        updateObservationList(data)
    }

    /**
     * ================== BEHAVIOURS ==================
     */
    // PLOT CONTROLS
    // sets the behaviour for mouse panning on the plot
    canvas_chart.on("mousemove",function()
    {
        var info = getPixelInfo(d3.mouse(this));
        // update pixel info
        updatePixelInfo(info)
        if(info != null)
            updateFreqHistogram(info.obs)
        else // weird that I have to do this...
            updateFreqHistogram(null)
    });
    // defines the "change render mode" behaviour
    $("#plot-color-property").on('change', (function() {
        setRenderMode(this.value)
        updateCanvas()
    }))
    // defines the "highlight overlapping observations" behaviour
    $('#highlightOverlap').on('change', (function() {
        if(this.checked)
            addFilter('highlightOverlap', null);
        else
            removeFilter('highlightOverlap', null)
        //setHighlightOverlap(this.checked)
    }))

    // LIST CONTROLS
    // highlights the panned-over observation
    $('#obs_list tbody').on('click', 'tr', function () 
    {
        var row = getObservationRowData($(this))
        // if it's selected, unselect
        if ($(this).hasClass('selected'))
        {
            $(this).removeClass('selected');
            removeFilter('highlightObservation', row.index)
        }
        else
        {
            $(this).addClass('selected');
            addFilter('highlightObservation', row.index)
        }
    } );
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

/**
 * Updates the pixel information display
 */
function updatePixelInfo(info)
{
    if(info != null)
    {
        document.getElementById('pixel-ra').innerHTML = info.ra
        document.getElementById('pixel-dec').innerHTML = info.dec
        document.getElementById('pixel-n-pointings').innerHTML = info.count_pointings
        document.getElementById('pixel-avg-res').innerHTML = info.avg_res
        document.getElementById('pixel-avg-sens').innerHTML = info.avg_sens
        document.getElementById('pixel-avg-int-time').innerHTML = info.avg_int_time
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
    }
}