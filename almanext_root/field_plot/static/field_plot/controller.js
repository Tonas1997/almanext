import
{
    addFilter, // add a filter
    removeFilter, // remove a filter
    renderData, // initial render
    updateCanvas, // plot update
    getPixelInfo, // gets the selected pixel
    canvas_chart, // canvas object
    setRenderMode,
    showPlotControls
} from "./plot.js"

import
{
    showFreqHistogram, // initial render
    highlightFreqHistogram, // plot update
    updateFreqHistogram // plot update - change axis
} from "./freq_histogram.js"

import
{
    showSensitivityPlot,
    updateSensitivityPlot
} from "./sensitivity_imp.js"

import
{
    showObservationList, // initial render
    updateObservationList, // list update
    getObservationRowData, // get row data
    highlightRows
} from "./obs_list.js"

// ========================================================
// ================= PAGE INITIALIZATION ==================
// ========================================================

// loads the emission lines into the form's selectmenu on startup
function fillLinesMenu(linesJSON)
{
    var len = linesJSON.lines.length
    for(var i = 0; i < len; i++) 
    {
        var curr_line = linesJSON.lines[i];
        var line_str = curr_line.species + " (" + curr_line.line + ")"
        console.log(line_str)
        emission_lines.push(
        {
            "line_id": curr_line.line_id, 
            "species": curr_line.species, 
            "line": curr_line.line, 
            "frequency": curr_line.frequency
        })
    }

    $.each(emission_lines, function (i, line) {
        $('#form-lines').append($('<option>', { 
            value: line.line_id,
            text : line.species + " (" + line.line + ")" 
        }));
    });
}
// ========================================================
// =================== STATE VARIABLES ====================
// ========================================================

var first_render = true
var emission_lines = []
var observations = []
var options = {highlight_overlap: false}

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

function getFreq(option)
{
    var minF, maxF
    switch(option)
    {
        case "freq-bands":
        {
            return getBands()
        }
        
        case "freq-range":
        {
            var minF = parseFloat($("#formfield_freq_min").val());
            var maxF = parseFloat($("#formfield_freq_max").val());
            return [minF, maxF]
        }

        case "freq-lines":
        {
            console.log(emission_lines)
            console.log($("#form-lines").val())
            // this needs to put this in an array to keep the request field coherent with those of other options
            return [emission_lines.find(({line_id}) => line_id == $("#form-lines").val()).frequency]
        }
    }
}

function getRedshift()
{
    var values = $('#formfield-redshift').slider("option", "values");
    return values
}

/**
 * Validates the plot parameters
*/
function checkParams()
{
    var error = false
    console.log(getFreq())
    var freq_option = $("input[name='freq_option']:checked").val()

    parameters = {
        ra: parseFloat($("#formfield_ra").val()),
        dec: parseFloat($("#formfield_dec").val()),
        size: parseFloat($("#formfield_size").val()),
        frequency_option: freq_option,
        frequency: getFreq(freq_option),
        redshift: getRedshift(),
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
 * Initializes the plot parameter controls
 */
$(function() 
{
    // Frequency options
    $("input[type='radio']").checkboxradio({icon: false});
    // Enable and disable control groups according to the selected option
    $("#radio-1").on('click', (function() {
        $('input[name=band_box]').removeAttr('disabled');
        $('input[name=formfield_freq]').attr('disabled','true');
        $("#form-lines").selectmenu("disable");
    }))
    $("#radio-2").on('click', (function() {
        $('input[name=band_box]').attr('disabled','true');
        $('input[name=formfield_freq]').removeAttr('disabled');
        $("#form-lines").selectmenu("disable");
    }))
    $("#radio-3").on('click', (function() {
        $('input[name=band_box]').attr('disabled','true');
        $('input[name=formfield_freq]').attr('disabled','true');
        $("#form-lines").selectmenu("enable");
    }))

    // Redshift slider
    $("#formfield-redshift").slider(
        {
            min: 0, 
            max: 12,  
            values:[0,0],
            step: 0.01,
            disabled: false,
            range: true
        })
    // Change the z display
    $("#formfield-redshift").on('slide', (function(event, ui) {
       $("#redshift-val-min").html(ui.values[0])
       $("#redshift-val-max").html(ui.values[1])
    }))
    // Line selection menu
    $("#form-lines").selectmenu({
        maxHeight: '500px'})
    $("#infotabs").tabs();
    $("#freq-histogram-yaxis2").selectmenu();
    $("#freq-histogram-redshift").slider({min: 0, max: 100, value:50, values:[10,90],slide: function(event, ui) {
        console.log(ui.value)
    }
    });

    $.ajax(    
        {
            url: '/get_lines/',
            data_type: 'json',
            success: function(data) {
                console.log(data)
                fillLinesMenu(JSON.parse(data))
                $("#form-lines option:eq(1)").attr("selected","selected");
                $("#form-lines").selectmenu("refresh")
            }
        }
    )
});

/**
 * Enable and disable frequency controls according to the selected option
 */

/**
 * Sets the plot mode
 */
$("#plot-color-property").on('change', (function() {
    setRenderMode(this.value)
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
    /**
     * ================== INITIALIZATION ==================
     */
    // defines some variables
    if(first_render) showPlotControls()
    var plot_properties = renderData(data)
    var plot_cs = data.continuum_sensitivity
    var plot_pixels = data.pixels        

    // initializes the HTML handles for the plot properties
    showPlotInfoTab()
    showPlotInfo(plot_properties)
    
    // keeps duplicate plots from being rendered when the dataset is regenerated
    // TODO
    if(first_render)
    {
        showFreqHistogram(plot_properties, plot_cs, emission_lines)
        showSensitivityPlot(plot_properties, plot_pixels)
        showObservationList(data) // not sure I want to initialize the table before getting the data... TODO
        first_render = false
    }
    else if(data.observations.length != 0)
    {
        updateFreqHistogram(plot_properties, plot_cs, emission_lines)
        updateSensitivityPlot(plot_pixels)
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
        {
            //console.log(info)
            highlightFreqHistogram(info.obs)
            highlightRows(info.obs)
        }
        else 
        {// weird that I have to do this...
            highlightFreqHistogram(null)
            highlightRows(null)
        }
        // highlight the hovered observations on the table

        
    });
    // defines the "highlight overlapping observations" behaviour
    $('#btn-overlap').on('click', (function() {
        if(!options.highlight_overlap)
        {
            addFilter('highlightOverlap', null);
            options.highlight_overlap = true
        }
        else
        {  
            removeFilter('highlightOverlap', null)
            options.highlight_overlap = false
            console.log("highlightOverlap!")
        }
        //setHighlightOverlap(this.checked)
    }))

    // FREQUENCY HISTOGRAM CONTROLS


    // LIST CONTROLS
    // highlights the panned-over observation
    $('#obs_list tbody').off().on('click', 'tr', function () 
    {
        console.log("ENTRAR")
        console.log("click!")
        var row = getObservationRowData($(this))
        // if it's selected, unselect
        if ($(this).hasClass('selected'))
        {
            console.log("vou tirar filtros...")
            $(this).removeClass('selected');
            removeFilter('highlightObservation', row.index) 
        }
        else
        {
            console.log("vou adicionar filtros...")
            $(this).addClass('selected');
            addFilter('highlightObservation', row.index)
        }
    } );
}

/**
 * Creates or updates the plot information display
 * @param {*} plot_properties The properties object
 */
function showPlotInfo(plot_properties)
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
        document.getElementById('pixel-cs-improvement').innerHTML = (info.cs_best/info.cs_comb).toFixed(2)
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
        document.getElementById('pixel-cs-improvement').innerHTML = nan
    }
}

function showPlotInfoTab()
{
    document.getElementById("tab-plot-information").innerHTML = `
    <div class="tab-information">
        <div id="tab-information-plot">
            <div class="info-wrapper">	
                <div id="tab-information-plot-info">
                    <div id="infobox-plot-num">
                        <div class='value-box'><div class='value-box field label'>Total area</div>
                            <div class='field value'><div id="plot-total-area">--.--</div>&nbsp arcsec<sup>2</sup></div></div>
                        <div class='value-box'><div class='value-box field label'>Overlapping area</div>
                            <div class='field value'><div id="plot-overlap-area">--.--</div>&nbsp arcsec<sup>2</sup></div></div>
                        <div class='value-box'><div class='value-box field label'>Overlapping area (%)</div>
                            <div class='field value'><div id="plot-overlap-area-pct">--.--</div>&nbsp %</div></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="sep-vertical"></div>
        <div id="tab-information-pixel">
            <div class="info-wrapper">
                <div class='value-box'><div class='value-box field label'>RA</div>
                    <div class='field value'><div id='pixel-ra'> --.-- </div>&nbsp deg</div></div>
                <div class='value-box'><div class='value-box field label'>Dec</div>
                    <div class='field value'><div id='pixel-dec'> --.-- </div>&nbsp deg</div></div>
                <div class='value-box'><div class='value-box field label'>Number of pointings</div>
                    <div class='field value'><div id='pixel-n-pointings'> --.-- </div></div></div>
                <div class='value-box'><div class='value-box field label'>Average resolution</div>
                    <div class='field value'><div id='pixel-avg-res'> --.-- </div>&nbsp arcsec<sup>2</sup></div></div>
                <div class='value-box'><div class='value-box field label'>Average sensitivity</div>
                    <div class='field value'><div id='pixel-avg-sens'> --.-- </div>&nbsp mJy/beam</div></div>
                <div class='value-box'><div class='value-box field label'>Average int. time</div>
                    <div class='field value'><div id='pixel-avg-int-time'> --.-- </div>&nbsp s</div></div>
                <div class='value-box'><div class='value-box field label'>CS improvement</div>
                    <div class='field value'><div id='pixel-cs-improvement'> --.-- </div></div></div>
            </div>
        </div>
    </div>`
}