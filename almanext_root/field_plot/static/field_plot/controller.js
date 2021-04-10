import
{
    updatePlotSelectedObs, // remove a filter
    renderData, // initial render
    updateCanvas, // plot update
    getPixelInfo, // gets the selected pixel
    canvas_chart, // canvas object
    showPlotControls
} from "./plot.js"

import
{
    showFreqHistogram, // initial render
    highlightFreqHistogram, // update plot with new data (after first render)
    updateFreqHistogram // plot update - change axis
} from "./freq_histogram.js"

import
{
    showSensitivityPlot,
    updateSensitivityPlot,
    changeVisibleBars
} from "./sensitivity_imp.js"

import
{
    showObservationList, // initial render
    updateObservationList, // update list with new data (after first render)
    getObservationRowData, // get row data
    updateListSelectedObs // update selected observations
    //highlightRows
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
        //console.log(line_str)
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
var selected_observations = []
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
    //console.log(band_list)
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

function convertHMStoDD(hms)
{
    var vals = hms.split(":")
    console.log(vals[0]*15 + vals[1]/60 + vals[2]/3600)
    return(vals[0]*15 + vals[1]/60 + vals[2]/3600)
}

function convertDMStoDD(hms)
{
    var vals = hms.split(":")
    return(vals[0] + vals[1]/60 + vals[2]/3600)
}

function parseRA(str) 
{
    if(str == "")
        return true
    // first: see if the value was inserted as a decimal
    var ra = parseFloat(str)
    var regex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]:[0-5][0-9]/gm
    if(!isNaN(str))
    {
        if(ra > 360 || ra < 0)
            return "The inserted value must lie between 0 and 360 degrees."
        else
        {
            return true
        }
    }
    // if not, try the hh:mm:ss regex
    else if(regex.test(str))
    {
        console.log("here")
        ra = convertHMStoDD(str)
        console.log(ra)
        if(ra > 360 || ra < 0)
            return "The inserted value must lie between 00:00:00 and 24:00:00 (not including the latter)."
        else
            return true
    }
    // else, return error
    else
    {
        return "Right ascension must be represented in one of the following formats:<ul><li>Decimal degrees (ex: 23.128)</li><li>HH:MM:SS (ex: 18:50:34.9)</li></ul>"
    }
}
function parseDec(str)
{
    if(str == "")
        return true
    // first: see if the value was inserted as a decimal
    var dec = parseFloat(str)
    var regex = /^(-+)?(?:90|[0-8][0-9]):[0-5][0-9]:[0-5][0-9]$/ 
    if(!isNaN(str))
        if(dec > 90 || dec < -90)
            return "The inserted value must lie between -90 and 90 degrees."
        else
            return true
    // if not, try the dd:mm:ss regex
    else if(regex.test(str))
    {
        dec = convertDMStoDD(str)
        console.log(dec)
        if(dec > 90 || dec < -90)
            return "The inserted value must lie between -90 and 90 degrees."
        else
            return true
    }
    else
    {
        return "Declination must be represented in one of the following formats:<ul><li>Decimal degrees (ex: 23.128)</li><li>DD:MM:SS (ex: 18:50:34.9)</li></ul>"
    }
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
            url: $("#url-div-lines").data('url'),
            data_type: 'json',
            success: function(data) {
                fillLinesMenu(JSON.parse(data))
                $("#form-lines option:eq(1)").attr("selected","selected");
                $("#form-lines").selectmenu("refresh")
            }
        }
    )

    // initializes the error tooltip for the RA field
    $("#formfield_ra").tooltip({
        content: "asd",
        position: { my: "left center", at: "left bottom+30" },
        classes: 
        {
            "ui-tooltip": "input-tooltip error-tooltip"
        }
    })
    $("#formfield_ra").tooltip("disable")
    // verifies the RA input is valid
    $("#formfield_ra").keyup(function()
    {
        var result = parseRA($(this).val())
        if(result != true)
        {
            $(this).addClass("input-error")
            $(this).tooltip("enable")
            $(this).tooltip("option", "content", result)
            $(this).tooltip("open")
        }
        else
        {
            $(this).removeClass("input-error")
            $(this).tooltip("disable")
            $(this).tooltip("close")
        }    
    })

    // initializes the error tooltip for the Dec field
    $("#formfield_dec").tooltip({
        position: { my: "left center", at: "left bottom+30" },
        classes: 
        {
            "ui-tooltip": "input-tooltip error-tooltip"
        }
    })
    $("#formfield_dec").tooltip("disable")
    // verifies the Dec input is valid
    $("#formfield_dec").keyup(function()
    {
        var result = parseDec($(this).val())
        if(result != true)
        {
            $(this).addClass("input-error")
            $(this).tooltip("enable")
            $(this).tooltip("option", "content", result)
            $(this).tooltip("open")
        }
        else
        {
            $(this).removeClass("input-error")
            $(this).tooltip('disable')
            $(this).tooltip("close")
        }
    })
});

function getPlotProgress(tid)
{
    $.ajax({
        type: 'get',
        url: $("#url-div-plot-progress").data('url'),
        data: {'task_id': tid},
        success: function (data) {
            console.log(data)
            if (data.state == 'PENDING') {
                console.log('pending');
            }
            else if (data.state == 'PROGRESS') {
                console.log('progress');
            }
            else if(data.state == 'SUCCESS'){
                console.log('success');
            }
            if (data.state != 'SUCCESS') {
                setTimeout(function () {
                    getPlotProgress(tid)
                }, 500);
            }
        },
        error: function (data) {
            console.log("error!");
        }
    });
}

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
                url: $("#url-div-plot").data('url'),
                data: parameters,
                data_type: 'json',
                success: function(data) {
                    console.log(data)
                    getPlotProgress(data)
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
    console.log("success")
    if(first_render) showPlotControls()
    console.log("render data")
    var plot_properties = renderData(data)
    var plot_cs = data.continuum_sensitivity
    var plot_pixels = data.pixels        

    // initializes the HTML handles for the plot properties
    console.log("show plot info")
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
            //highlightRows(info.obs)
        }
        else 
        {// weird that I have to do this...
            highlightFreqHistogram(null)
            //highlightRows(null)
        }
    });

    canvas_chart.on("click",function()
    {
        var info = getPixelInfo(d3.mouse(this));
        if(info != null)
        {
            
            var indexes = []
            for(var o in info.obs)
            {
                indexes.push(info.obs[o].index)
            }
            console.log("INDEXES")
            console.log(indexes)
            console.log("SELECTED_OBS")
            console.log(selected_observations)
            
            if(compareArrays(indexes, selected_observations))
                remSelectedObs()
            else
            {
                remSelectedObs()
                addSelectedObs(indexes)
            }   
        }
        else
            remSelectedObs()
    });

    // SENSITIVITY HISTOGRAM CONTROLS
    $("#cs-histogram-array").selectmenu(
    {
            change: function(event, ui)
            {
                changeVisibleBars(ui.item.value)
                updateCanvas()
            }
    })

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
            console.log("tem classe")
            $(this).removeClass('selected');
            remSelectedObs(row.index)
        }
        else
        {
            console.log("nao tem classe")
            $(this).addClass('selected');
            addSelectedObs(row.index)
        }
    } );
}

function updateSelectedObs()
{   /*
    var new_selected_obs = []
    // if this is a single object, put it into an array
    if(!Array.isArray(indexes))
        indexes = [indexes]
    indexes.forEach(i => 
    {
        new_selected_obs.push(i)
    });
    if(compareArrays(selected_observations, new_selected_obs))
        new_selected_obs = []
    selected_observations = new_selected_obs
    */
    console.log(selected_observations)
    updatePlotSelectedObs(selected_observations)
    //updateHistSelectedObs(selected_observations)
    //updateSensSelectedObs(selected_observations)
    updateListSelectedObs(selected_observations)
}

function addSelectedObs(obs)
{
    // if obs is a single observation, just add it to the list
    if(!Array.isArray(obs))
    {
        selected_observations.push(obs)
    }
    // else, add one by one
    else
    {
        for(var i in obs)
        selected_observations.push(obs[i])
    }
    updateSelectedObs()
}

function remSelectedObs(obs)
{
    // if this function is called without arguments, unselect all observations
    if(obs == undefined)
        selected_observations = []
    // if obj is a single observation, just append it to the list
    else if(!Array.isArray(obs))
    {
        console.log(obs)
        console.log(selected_observations)
        selected_observations = selected_observations.filter(o => o != obs)
    }
    // else, remove one by one
    else
    {
        
        for(var i in obs)
        selected_observations = selected_observations.filter(o => o != i)
    }
    updateSelectedObs()
}

/**
 * Creates or updates the plot information display
 * @param {*} plot_properties The properties object
 */
function showPlotInfo(plot_properties)
{
    console.log(plot_properties)
    document.getElementById('plot-n-observations').innerHTML = plot_properties.n_observations
    document.getElementById('plot-total-area').innerHTML = "~" + plot_properties.total_area
    document.getElementById('plot-overlap-area').innerHTML = "~" + plot_properties.overlap_area
    document.getElementById('plot-overlap-area-pct').innerHTML = "~" + (plot_properties.overlap_area/plot_properties.total_area*100).toFixed(2)
}

/**
 * Updates the pixel information display
 */
function updatePixelInfo(info)
{
    var nan = "--.--"
    if(info != null)
    {
        document.getElementById('pixel-ra').innerHTML = info.ra.toFixed(2)
        document.getElementById('pixel-dec').innerHTML = info.dec.toFixed(2)
        document.getElementById('pixel-n-pointings').innerHTML = info.count_pointings.toFixed(2)
        document.getElementById('pixel-avg-res').innerHTML = info.avg_res.toFixed(2)
        document.getElementById('pixel-avg-sens').innerHTML = info.avg_sens.toFixed(2)
        document.getElementById('pixel-avg-int-time').innerHTML = info.avg_int_time.toFixed(2)
        var cs_improvement = (info.cs_comb == null ? nan : (info.cs_best/info.cs_comb).toFixed(2)) 
        document.getElementById('pixel-cs-improvement').innerHTML = cs_improvement 
    }
    else
    {
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
                        <div class='value-box'><div class='value-box field label'>Number of observations</div>
                            <div class='field value'><div id="plot-n-observations">--.--</div></div></div>
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
                <div class='value-box'><div class='value-box field label'>Pixel pointings</div>
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

// needed for the plot selection/deselection
function compareArrays(_arr1, _arr2)
{
    if(!Array.isArray(_arr1) || !Array.isArray(_arr2) || _arr1.length !== _arr2.length) 
    {
        return false;
    }
      
    // .concat() to not mutate arguments
    const arr1 = _arr1.concat().sort();
    const arr2 = _arr2.concat().sort();
    
    for (let i = 0; i < arr1.length; i++) 
    {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
      
    return true;
}