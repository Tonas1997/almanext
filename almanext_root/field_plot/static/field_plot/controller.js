/*import
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
    updateFreqHistogram,
    drawArea // plot update - change axis
} from "./freq_histogram.js"*/

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
            "frequency": curr_line.frequency,
            "image_file": curr_line.image_file
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
var progress_bar
var plot_properties

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

function initializeProgressBar()
{
    progress_bar = new ProgressBar.Line('#progress-bar', {
        color: "rgb(55,55,85)",
        text: 
        {
            //className: 'progressbar__label',
            style: 
            {
                color: '#828295',
                position: 'absolute',
                left: '50%',
                top: '50%',
                padding: 0,
                margin: 0,
                transform: {
                    prefix: true,
                    value: 'translate(-50%, -50%)'
                }
            },
            autoStyleContainer: false,    
    }});
}

function updateProgressBar(data)
{
    progress_bar.animate(data.result.percent / 100, {
        duration: 200
    });
    progress_bar.setText(data.result.description)
}

function destroyProgressBar()
{
    progress_bar.destroy()
}

function getPlotProgress(tid)
{
    $.ajax({
        type: 'get',
        url: $("#url-div-plot-progress").data('url'),
        data: {'task_id': tid},
        success: function (data) {
            console.log(data)
            if (data.state == 'PENDING') 
            {
                console.log('pending');
            }
            else if (data.state == 'PROGRESS') 
            {
                updateProgressBar(data)
                console.log('progress');
            }
            else if(data.state == 'SUCCESS')
            {
                console.log('success');
                destroyProgressBar()
                initializePlotView(JSON.parse(data.result))
            }
            if (data.state != 'SUCCESS') 
            {   
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
                    initializeProgressBar()
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
    if(first_render) showPlotControls()
    console.log("render data")
    plot_properties = renderData(data)
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
{   
    updateHighlightedPixels()
    selectFreqHistBars()
    //updateSensSelectedObs(selected_observations)
    updateListSelectedObs(selected_observations)
}

function addSelectedObs(obs)
{
    console.log(obs)
    // if obs is a single observation, just add it to the list
    if(!Array.isArray(obs))
    {
        selected_observations.push(obs)
    }
    // else, add one by one
    else
    {
        for(var i in obs)
        {
            if(!selected_observations.includes(obs[i]))
                selected_observations.push(obs[i])
        }
    }
    updateSelectedObs()
}

function remSelectedObs(obs)
{
    console.log(selected_observations)
    console.log(obs)
    // if this function is called without arguments, unselect all observations
    if(obs == undefined)
        selected_observations = []
    // if obj is a single observation, just append it to the list
    else if(!Array.isArray(obs))
    {
        selected_observations = selected_observations.filter(o => o != obs)
    }
    // else, remove one by one
    else
    {
        selected_observations = selected_observations.filter(function(o)
        {
            return !obs.includes(o)
        })
    }
    console.log(selected_observations)
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

// ================================================================================================
// ========================================== PLOT ===============================================
// ================================================================================================


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

// interface variables
var plot_canvas_chart
var context;
var plot_transform_store;
var plot_color_scale = {scale: null, worst: 0, best: 0, ref: 0};
var plot_axis_label;

// TODO
var plot_ui_options = {render_mode: "count_pointings", pixel_tooltip: false, highlight_overlap: false}

/**
 * Updates and renders a new dataset
 * @param {*} plot_json The JSON representation of the current field
 * @returns 
 */
function renderData(plot_json)
{
    pixel_len = plot_json.properties.pixel_len

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
    for (var i = 0; i < observations.length; i++) 
    {
        observation_array[i] = observations[i]
    }

    // Copy pixels
    for (var i = 0; i < dataset.length; i++) 
    {
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

    // EVENTS
    // Zooming
    d3.select(context.canvas).call(d3.zoom()
        .scaleExtent([1,15])
        .translateExtent([[0,0],[plot_width,plot_width]])
        .on("zoom", () => updateCanvas(d3.event.transform)))
        .on("dblclick.zoom", null);

    // Moving the mouse around and highlighting different pixels
    plot_canvas_chart.on("mousemove",function()
    {
        var info = getPixelInfo(d3.mouse(this)); 
        // update pixel info
        updatePixelInfo(info)
        if(info != null)
        {
            //console.log(info)
            //highlightFreqHistogram(info.obs)
            //highlightRows(info.obs)
        }
        else 
        {// weird that I have to do this...
            //highlightFreqHistogram(null)
            //highlightRows(null)
        }
    });

    // Clicking on a pixel and selecting its observations
    plot_canvas_chart.on("click",function()
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

/**
 * Updates the plot to reflect changes in scaling, render modes, etc
 * @param {} transform The new transform object, if one exists
 */
function updateCanvas(transform)
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

/**
 * Updates the pixels which have to be highlighted in the current context
 */
function updateHighlightedPixels()
{
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

/**
 * Updates the UI color scale and its label
 * @param {} inverse 
 */
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
 * Gets the information of the currently hovered pixel, if one exists
 * @param {*} mouse The mouse position object
 * @returns The currently hovered pixel if one exists, otherwise null
 */
function getPixelInfo(mouse)
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

/**
 * Sets the HTML for the plot controls and initializes their behaviours
 */
function showPlotControls()
{
    $("#plot-controller-placeholder").remove()
    $("#plot-controller").append(`<div id="plot-information">
			<div id="info-row">
				<div id="infotabs">
					<ul>
						<li><a href="#tab-plot-information">Plot information</a></li>
						<li><a href="#tab-frequency-coverage">Frequency support</a></li>
						<li><a href="#tab-gained-sensitivity">Gained sensitivity</a></li>
					</ul>	
					<div id="tab-plot-information" class='pane-frame'></div>
					<div id="tab-frequency-coverage" class='center'></div>
					<div id="tab-gained-sensitivity" class='center'></div>
				</div>
			</div>
			<div class="sep-horizontal-small"></div>
			<div id="observations-table">
				<div class="info-wrapper">
					<table id='obs_list' class='display compact' width='90%'>
						<thead>
							<tr>
								<th>Project code</th>
								<th>Source name</th>
								<th>RA</th>
								<th>Dec</th>
								<th>Total area</th>
								<th>Overlapping area</th>
							</tr>
						</thead>
					</table>
				</div>
			</div>
		</div>`)

    $("#infotabs").tabs();
    $("#freq-histogram-yaxis2").selectmenu();
    $("#freq-histogram-redshift").slider({min: 0, max: 100, value:50, values:[10,90],slide: function(event, ui) {
        console.log(ui.value)
    }
    });

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
            plot_ui_options.render_mode = ui.item.value
            updateCanvas()
        },
        position:
        {
            collision: "flip"
        }
    })

    $("#plot-color-property").on('change', (function() {
        plot_ui_options.render_mode = this.value
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

}

// ------------------- AUXILIARY FUNCTIONS -------------------

/**
 * Aux function that creates a double (square) array filled with zeros
 * @param {} length The length of the array
 * @returns The array
 */
function createArray(length)
{
    var arr = Array(length).fill(0).map(x => Array(length).fill(0))
    return arr;
}

/**
 * Returns a list of the indexes of the observations covering a given pixel
 * @param {*} px_observations 
 * @returns The index list of the observations
 */
function getPixelObservations(px_observations)
{
    var observations = []

    for(var i = 0; i < px_observations.length; i++)
    {
        var observation = observation_array[px_observations[i]]
        observations.push(observation)
    }
    return observations
}

// ================================================================================================
// ====================================== FREQUENCY PLOT ==========================================
// ================================================================================================

var freq_hist_width //= $('#infotabs').width() - 50;
var freq_hist_height //= $('#infotabs').height() - 40;
const freq_hist_margin = {left: 50, right: 40, top: 10, bottom: 15, xlabel: 25, ylabelLeft: 15, ylabelRight: 10};

var freq_hist_svg
var freq_hist_xScale
var freq_hist_yScale1
var yScale2
var freq_hist_xAxis
var freq_hist_yAxis1
var yAxis2
var freq_hist_lines_area
var freq_hist_draw_area
var freq_hist_transform_store


var bucket_size = 0.01 // in GHz
var z = 0 // selected redshift
const c = 299792458 // speed of light

var minF;
var maxF;
var minC;
var maxC;
var minS;
var maxS;
var minFO;
var maxFO;
var minFA;
var maxFA;

var datasets = {}
var max_lod = 0
var left_axis = "obs_count"
var datatype = "hist"

/**
 * Initializes the frequency histogram, given its properties, frequency buckets and emission lines
 * @param {*} plot_properties The plot properties object
 * @param {*} plot_freqs The plot frequency object
 * @param {*} emission_lines The emission lines found in the plot's frequency range
 */
function showFreqHistogram(plot_properties, plot_freqs, emission_lines)
{
    minF = plot_properties.min_frequency // lowest frequency bucket
    maxF = plot_properties.max_frequency // highest frequency bucket
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens
    minFO = plot_properties.min_freq_obs_count // highest number of observations covering any bucket
    maxFO = plot_properties.max_freq_obs_count // see above
    minFA = plot_properties.min_freq_obs_t_area
    maxFA = plot_properties.max_freq_obs_t_area

    freq_hist_width = $('#info-row').width() - 20;
    freq_hist_height = $('#info-row').height() - 95;
    var g = 0

    document.getElementById("tab-frequency-coverage").innerHTML = `
    <div class="tab-histogram">
        <div id='freq-histogram'>
            <div id="freq-histogram-tooltip">
                <div id="line-tooltip-img"></div>
                <div class="sep-horizontal-small"></div>
                <div class="line-tooltip-vals">
                    <div class="label">Chemical species</div>
                        <div id="line-tooltip-chem"></div>
                    <div class="label">Emission line</div>
                        <div id="line-tooltip-line"></div>
                    <div class="label">Frequency (z=<span id="line-z"></span>)</div>
                        <div id="line-tooltip-freq-div"><span id="line-tooltip-freq"></span>&nbspGHz</div>
                </div>
            </div>
        </div>
        <div id="freq-histogram-controls" class='histogram-controls-wrapper'></div>
    </div>`
    //margin = 5;
    
    d3.select('#freq-histogram-tooltip').style("display", "none");

    // =========== DEFINE AXIS ===========
    // frequency buckets
    freq_hist_xScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([freq_hist_margin.left, freq_hist_width - freq_hist_margin.right]);
    freq_hist_xAxis = d3.axisBottom()
        .scale(freq_hist_xScale)

    // left scale - default: number of observations per frequency
    freq_hist_yScale1 = d3.scaleLinear()
        .domain([minFO, maxFO])
        .range([freq_hist_height - freq_hist_margin.bottom - freq_hist_margin.top, 0])
    freq_hist_yAxis1 = d3.axisLeft() 
        .scale(freq_hist_yScale1)

    // line sensitivity
    yScale2 = d3.scaleLinear()
        .domain([maxC, minC])
        .range([freq_hist_height - freq_hist_margin.bottom, freq_hist_margin.top])
    yAxis2 = d3.axisRight() 
        .scale(yScale2).ticks(10)


    // Create an SVG object
    freq_hist_svg = d3.select("#freq-histogram")
        .append("svg")
        .attr("width", freq_hist_width)
        .attr("height", freq_hist_height + freq_hist_margin.bottom)
        .attr("display", "block")
        .style("margin-top", freq_hist_margin.top)

    g = freq_hist_svg.append("g")
        .attr('id', 'x-axis')
        .attr('transform', 'translate(0,' + (freq_hist_height-freq_hist_margin.bottom) + ')')
        .call(freq_hist_xAxis)
    g = freq_hist_svg.append("text")             
        .attr("transform", "translate(" + (freq_hist_width/2) + " ," + (freq_hist_height - freq_hist_margin.bottom + freq_hist_margin.xlabel) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Frequency (GHz)");

    // left Y axis
    g = freq_hist_svg.append("g")
        .attr('id', 'y-axis1')
        .attr('transform', 'translate(' + freq_hist_margin.left + ',' + freq_hist_margin.top + ')')
        .call(freq_hist_yAxis1
            .tickFormat(d3.format(".0s")))
    g = freq_hist_svg.append("text")
        .attr("id", "y-axis1-label")             
        .attr("transform", "translate(" + freq_hist_margin.ylabelLeft + "," + (freq_hist_height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Observation count");

    // right Y axis
    g = freq_hist_svg.append("g")
        .attr('id', 'y-axis2')
        .attr('transform', 'translate(' + (freq_hist_width - freq_hist_margin.right) + ',0)')
        .call(yAxis2)
    g = freq_hist_svg.append("text")             
        .attr("transform", "translate(" + (freq_hist_width + freq_hist_margin.ylabelRight) + "," + (freq_hist_height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Line sensitivity (mJy/beam)");

    var clip1 = freq_hist_svg.append("defs").append("svg:clipPath")
        .attr("id", "clip1")
        .append("svg:rect")
        .attr("width", freq_hist_width - freq_hist_margin.left - freq_hist_margin.right)
        .attr("height", freq_hist_height - freq_hist_margin.top - freq_hist_margin.bottom)
        .attr("x", freq_hist_margin.left)
        .attr("y", freq_hist_margin.top);
    
    var clip2 = freq_hist_svg.append("defs").append("svg:clipPath")
        .attr("id", "clip2")
        .append("svg:rect")
        .attr("width", freq_hist_width - freq_hist_margin.left - freq_hist_margin.right)
        .attr("height", freq_hist_height - freq_hist_margin.top - freq_hist_margin.bottom)
        .attr("x", freq_hist_margin.left)
        .attr("y", freq_hist_margin.top);
    
    freq_hist_draw_area = freq_hist_svg.append("g")
        .attr("clip-path", "url(#clip1)")

    freq_hist_lines_area = freq_hist_svg.append("g")
        .attr("clip-path", "url(#clip2)")

    plot_freqs = removeEmpty(plot_freqs)

    // generate two additional levels of detail
    buildDatasets(plot_freqs)

    console.log(datasets)

    // draw the CS graph
    //drawCSPoints(plot_freqs) //I have to fix the scaling issues
    //drawFreqObsBars(plot_freqs)
    drawEmissionLines(emission_lines)
    drawControls()
    
    const extent = [[freq_hist_margin.left, 0], [freq_hist_width - freq_hist_margin.right, 0]];

    freq_hist_transform_store = d3.zoomIdentity
    freqHistZoomed()

    freq_hist_svg.call(d3.zoom()
        .scaleExtent([1, 1000])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", () => freqHistZoomed(d3.event.transform)));
}

/**
 * Creates a list of histograms, each representing a different level-of-detail for the frequency bins
 * @param {} plot_freqs The plot frequency object
 */
function buildDatasets(plot_freqs)
{
    datasets = {}
    var log_length = Math.floor(Math.log10(plot_freqs.length))
    for(var i = 1; i < log_length; i++)
    {
        var new_lod = d3.histogram().value(f => f.freq).domain(freq_hist_xScale.domain()).thresholds(10**(i + 1))
        var buckets = new_lod(plot_freqs).filter(b => b.length > 0)
        datasets["lod" + i] = buckets
    }
    max_lod = log_length
    datasets["lod" + log_length] = plot_freqs
}

/**
 * Updates the frequency histogram (triggered by zooming or panning)
 * @param {*} transform The transform object, if there's one
 */
function freqHistZoomed(transform)
{
    if(transform != undefined)
    {
        freq_hist_transform_store = transform
    }
    // get the new x scale
    var new_xScale = freq_hist_transform_store.rescaleX(freq_hist_xScale)
    // adjust the visible bars based on the current domain
    updateVisibleBars(new_xScale)
    // update the axis
    freq_hist_svg.selectAll("#x-axis").call(freq_hist_xAxis.scale(freq_hist_transform_store.rescaleX(freq_hist_xScale)));
    // update the position of the emission lines
    freq_hist_lines_area.selectAll("svg").attr("x", function(l) {return(new_xScale(l.frequency/(1+z)))})
    selectFreqHistBars()
}

/**
 * Redraws the histogram bars based on the current zoom level (ergo, dataset)
 * @param {*} new_xScale 
 */
function updateVisibleBars(new_xScale)
{
    var zoom_level = Math.round(Math.log10(freq_hist_transform_store.k) + 1)
    zoom_level = Math.min(zoom_level, max_lod)
    var dataset = datasets["lod" + zoom_level]
    drawBarsByDomain(new_xScale, dataset)
    //updateFreqHistogram()
}

/**
 * Draws the frequency bars given the new domain and the appropriate dataset
 * @param {*} freq_hist_xScale The modified x scale
 * @param {*} dataset The dataset (LOD) that will be rendered
 */
function drawBarsByDomain(freq_hist_xScale, dataset)
{
    var minX = freq_hist_xScale.domain()[0]
    var maxX = freq_hist_xScale.domain()[1]
    var f_dataset

    // is the dataset a histogram?
    if(dataset[0].x0 != undefined)
    {
        datatype = "hist"
        f_dataset = dataset.filter(d => (d.x0 < minX && d.x1 > minX) || 
                                    (d.x0 > minX && d.x1 < maxX) || 
                                    (d.x0 < maxX && d.x1 > maxX))
        
        freq_hist_draw_area.selectAll('rect').remove()

        freq_hist_draw_area.selectAll('rect')
        .data(f_dataset)
        .enter()
        .append('rect')
            .attr("type", "static")
            .attr("observations", function(f) { return getObsFromSet(f)})
            .attr("x", function(f) { return freq_hist_xScale(f.x0)})
            .attr("y", function(f) { return freq_hist_yScale1(getAvgBinVal(f)) + freq_hist_margin.top})
            .attr("width", function(f) { return getWidth(f.x0, f.x1) * freq_hist_transform_store.k})
            .attr("height", function(f) { return freq_hist_height - freq_hist_margin.top - freq_hist_margin.bottom - freq_hist_yScale1(getAvgBinVal(f))})
            .attr("class", "freq-histogram-obs-bar")
            .on("click", function(f) 
            { 
                if(!d3.select(this).classed("highlight"))
                {
                    var obs_list = getObsFromSet(f)
                    addSelectedObs(obs_list)
                }
                else
                {
                    remSelectedObs(getObsFromSet(f))
                }
            })

    }
    // else, it's the full point set!
    else
    {
        datatype = "point"
        f_dataset = dataset.filter(d => (d.freq < minX && d.freq + getWidth(bucket_size) > minX) || 
                                    (d.freq > minX && d.freq + getWidth(bucket_size) < maxX) || 
                                    (d.freq < maxX && d.freq + getWidth(bucket_size) > maxX))

        freq_hist_draw_area.selectAll('rect').remove()

        freq_hist_draw_area.selectAll('rect')
        .data(f_dataset)
        .enter()
        .append('rect')
            .attr("type", "static")
            .attr("observations", function(f) { return f.observations})
            .attr("x", function(f) { return freq_hist_xScale(f.freq)})
            .attr("y", function(f) { return freq_hist_yScale1(f.observations.length) + freq_hist_margin.top})
            .attr("width", function() { return getWidth(bucket_size) * freq_hist_transform_store.k})
            .attr("height", function(f) { return freq_hist_height - freq_hist_margin.top - freq_hist_margin.bottom - freq_hist_yScale1(f.observations.length)})
            .attr("class", "freq-histogram-obs-bar")
            .on("click", function(f) 
            { 
                if(!d3.select(this).classed("highlight"))
                {
                    addSelectedObs(f.observations)
                }
                else
                {
                    remSelectedObs(f.observations)
                }
            })
    }
}

/**
 * Highlights the bars containing at least one of the given index list
 */
function selectFreqHistBars()
{
    //freq_hist_draw_area.selectAll('rect').classed("highlight", false)
    if(selected_observations != null)
    {
        freq_hist_draw_area.selectAll('rect').each(function(d,i) 
        {
            var rect = d3.select(this)
            var rect_obs = rect.attr("observations")
            var bar_obs = rect_obs.split(",").map(Number)
            rect.classed("highlight", bar_obs.some(function(obs)
            {
                return(selected_observations.includes(obs))
            }))
        })
    }
}

/**
 * Updates the frequency histogram with new data (never called on the first page load)
 * @param {*} plot_properties The properties object
 * @param {*} plot_freqs The frequency object
 * @param {*} emission_lines The emission lines found in the plot's frequency range
 */
function updateFreqHistogram(plot_properties, plot_freqs, emission_lines)
{
    console.log(plot_properties)
    console.log(plot_freqs)
    console.log(emission_lines)
    // get the new plot's properties
    minF = plot_properties.min_frequency
    maxF = plot_properties.max_frequency
    console.log(minF)
    console.log(minF)
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens
    minFO = plot_properties.min_freq_obs_count 
    maxFO = plot_properties.max_freq_obs_count
    minFA = plot_properties.min_freq_obs_t_area
    maxFA = plot_properties.max_freq_obs_t_area
    // update the axis (with animations!)
    freq_hist_xScale.domain([minF, maxF])
    freq_hist_yScale1.domain([minFO, maxFO])
    yScale2.domain([maxC, minC])
    
    freq_hist_svg.select("#x-axis").transition().duration(2000).call(freq_hist_xAxis)
    freq_hist_svg.select("#y-axis1").transition().duration(2000).call(freq_hist_yAxis1)
    freq_hist_svg.select("#y-axis2").transition().duration(2000).call(yAxis2)

    buildDatasets(plot_freqs)
    drawEmissionLines(emission_lines)
    freqHistZoomed()
}

function drawCSPoints(plot_freqs)
{
    console.log(freq_hist_yScale1.domain())
    freq_hist_draw_area.selectAll('path').remove()

    var cs_line = d3.line()
        .defined(function(d) { return d.cs != null })
        .x(function(d) { return freq_hist_xScale(d.freq)})
        .y(function(d) { return yScale2(d.cs)})

    freq_hist_draw_area.append('path')
        //.data([plot_freqs].filter(cs_line.defined()))
        .attr('class', 'line')
        .attr('d', cs_line(plot_freqs))
}

/**
 * Creates the SVG representation of the given emission lines
 * @param {*} emission_lines The list of the emission lines
 */
function drawEmissionLines(emission_lines)
{
    freq_hist_lines_area.selectAll("svg").remove()
    // only render those lines that fall inside the frequency interval
    var visible_lines = emission_lines.filter((em) => {return(em.frequency/(1+z) > minF && em.frequency/(1+z) < maxF)})
    // create a group to place the emission lines
    var em_lines_g = freq_hist_lines_area.selectAll("svg")
        .data(visible_lines)
    createLinesSVG(em_lines_g)
}

/**
 * Updates the left axis data
 */
function changeAxisData()
{
    switch(left_axis)
    {
        case "obs_count":
        {
            freq_hist_yScale1.domain([minFO, maxFO])
            freq_hist_svg.select("#y-axis1").transition().duration(1000).call(freq_hist_yAxis1)
            $('#y-axis1-label').html("Observation count")
            freq_hist_draw_area.selectAll('rect')
                .transition()
                .duration(500)
                .attr("y", function(f) { 
                    return (datatype == "point" ? freq_hist_yScale1(f.observations.length) : freq_hist_yScale1(getAvgBinVal(f))) + freq_hist_margin.top
                })
                .attr("height", function(f) { 
                    return freq_hist_height - freq_hist_margin.top - freq_hist_margin.bottom - (datatype == "point" ? freq_hist_yScale1(f.observations.length) : freq_hist_yScale1(getAvgBinVal(f)))
                })
            break
        }
        case "total_area":
        {
            freq_hist_yScale1.domain([minFA, maxFA])
            freq_hist_svg.select("#y-axis1").transition().duration(1000).call(freq_hist_yAxis1)
            $('#y-axis1-label').html("Area (arcsec&#178;)")
            freq_hist_draw_area.selectAll('rect')
                .transition()
                .duration(500)
                .attr("y", function(f) { 
                    return (datatype == "point" ? freq_hist_yScale1(f.total_area) : freq_hist_yScale1(getAvgBinVal(f))) + freq_hist_margin.top
                })
                .attr("height", function(f) { 
                    return freq_hist_height - freq_hist_margin.top - freq_hist_margin.bottom - (datatype == "point" ? freq_hist_yScale1(f.total_area) : freq_hist_yScale1(getAvgBinVal(f)))
                })
            break
        }
    }
}

/**
 * Gets the average value for the currently-selected metric
 * @param {*} set The bin
 * @returns The bin's average value for the chosen axis option
 */
function getAvgBinVal(set)
{
    var total = 0
    switch(left_axis)
    {
        case "obs_count":
        {
            Array.from(set).forEach(b => total += b.observations.length)
            break;
        }
        case "total_area":
        {
            Array.from(set).forEach(b => total += b.total_area)
            break;
        }
    }
    //console.log(total)
    //console.log(set.length)
    return total / set.length
}

/**
 * Returns a list of all the observations contained in a bin, removing duplicates
 * @param {*} set The bin
 * @returns The observation index list
 */
function getObsFromSet(set)
{
    var obs_list = []
    for(var s = 0; s < set.length; s++)
    {
        var step_obs = set[s].observations
        for(var o = 0; o < step_obs.length; o++)
        {
            var obs = step_obs[o]
            if(!obs_list.includes(obs))
                obs_list.push(obs)
        }
    }
    return obs_list
}

/**
 * Initializes the histogram controls' HTML
 */
function drawControls()
{
    document.getElementById("freq-histogram-controls").innerHTML = `
            <div class='histogram-control'>
                <span class='text-label'>Vertical axis</span> 
                <select id='freq-histogram-yaxis1'>
                    <option value='obs_count'>Number of observations</option>
                    <option value='total_area'>Total area</option>
                </select>
            </div>
            <div class="sep-vertical-small"></div>
            <div class='histogram-control'>
                <span class='text-label'>Show emission lines</span>
                <input type="checkbox" name="checkbox-1" id="freq-histogram-emissionlines">
                <label for="freq-histogram-emissionlines" class="checkbox-clean"></label>
            </div>
            <div class="histogram-control">
                <span class='text-label'>Redshift</span>
                <div id="freq-histogram-redshift" class="slider-range-bar"></div>
            </div>
            <div class="histogram-control">
                <div class='z-tiny-labels'>
                    z= <span id='z-factor'></span><br>
                    v= <span id='z-speed'></span> km/s
                </div>
            </div>
            `
    updateSliderLabels(0)

    // convert the above elements to JQueryUI instances
    $("#freq-histogram-yaxis1").selectmenu(
    {
        change: function(event, ui)
        {
            left_axis = ui.item.value
            changeAxisData()
        }
    })
    $("#freq-histogram-emissionlines").checkboxradio();
    $("#freq-histogram-emissionlines").click(function() {
        if($(this).is(":checked"))
        {
            $("#freq-histogram-redshift").slider("enable")
            freq_hist_lines_area.selectAll("svg").transition().duration(500).style("opacity", 1.0)
        }
        else
        {
            $("#freq-histogram-redshift").slider("disable")
            freq_hist_lines_area.selectAll("svg").transition().duration(500).style("opacity", 0.0)
        }
    })
    $("#freq-histogram-redshift").slider(
    {
        // this redshift is expressed in km/s
        min: -0.004, 
        max: 0.004,  
        value:[0],
        step: 0.0001,
        disabled: true,
        slide: function(event, ui) 
        {   
            z = ui.value      
            updateSliderLabels(z)
            freqHistZoomed()
        }
    })
    $("#freq-histogram-redshift").dblclick(function() {
        z = 0
        $(this).slider("value", 0)
        updateSliderLabels(0)
        freqHistZoomed()
    })

    function updateSliderLabels(z)
    {
        $("#z-factor").text(z.toFixed(5))
        $("#z-speed").text((z/1000*c).toFixed(2))
    }
}

/**
 * Creates the SVG representation of an emission lines
 * @param {} em_lines_g The SVG group to place the lines in
 */
function createLinesSVG(em_lines_g)
{
    var line = em_lines_g
        .enter()
        .append("svg")
        .attr("x", function(e) {return freq_hist_xScale(e.frequency/(1+z))-5})
        .attr("y", freq_hist_margin.top)
        .attr("width", 50)
        .attr("height", 200)
        .style("opacity", 0.0)
        /*
        .on("mouseout", function() {
            d3.select("#freq-histogram-tooltip")
                .style("display", "none")
        })*/
    line.append("rect")
        .attr("x", 0)
        .attr("y", 45)
        .attr("width", 10)
        .attr("height", 30)
        .attr("stroke", "#b4b40f")
        .attr("stroke-width", 4)
        .attr("fill", "#b4b40f")
    line.append("text")
        .attr("dominant-baseline", "middle")
        .attr("font-family", "verdana")
        .attr("font-size", "10px")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(6,60) rotate(270)")
        .text(function(e) {return e.species})
    line.append("line")
        .attr("stroke", "#b4b40f")
        .attr("stroke-linecap", "null")
        .attr("stroke-linejoin", "null")
        .attr("y2", "45")
        .attr("x2", "5")
        .attr("y1", "0")
        .attr("x1", "5")
        .attr("stroke-width", "2")
        .attr("fill", "none")
    line.append("line")
        .attr("stroke", "#b4b40f")
        .attr("stroke-linecap", "null")
        .attr("stroke-linejoin", "null")
        .attr("y2", "120")
        .attr("x2", "5")
        .attr("y1", "75")
        .attr("x1", "5")
        .attr("stroke-width", "2")
        .attr("fill", "none")

    line.style("cursor", "default")

    line.on("mouseover", function(e) {
        if($("#freq-histogram-emissionlines").is(":checked"))
        {
            // first of all, display and position the tooltip...
            var line_svg = d3.select(this)
            d3.select("#freq-histogram-tooltip")
                .attr('class', "line-tooltip")
                .style('top', -120 + 'px')
                .style('left', (line_svg.attr("x") - 48) + 'px')
                .style('display', 'block')

            // then load the image and fill in the line information...
            var img = document.createElement("img")
            img.src = IMAGE_DIR + e.image_file
            img.width = 100
            img.height = 100
            $("#line-tooltip-img").empty()
            $("#line-tooltip-img").append(img)
            $("#line-tooltip-chem").html(e.species)
            $("#line-tooltip-line").html(e.line)
            $("#line-tooltip-freq").html((e.frequency/(1+z)).toFixed(4))
            $("#line-z").html(z)

            // reduce opacity of the other lines to highlight the current one
            var self = line_svg
            freq_hist_lines_area.selectAll("svg")
                .filter(function(x) { return self != this; })
                .transition()
                .duration(200)
                .style("opacity", 0.2)
                
            line_svg.transition().duration(50).style("opacity", 1.0)
            
        }
    })
    line.on("mouseout", function() {
        // hide the tooltip
        d3.select("#freq-histogram-tooltip")
            .style("display", "none")

        // set normal opacities!
        if($("#freq-histogram-emissionlines").is(":checked"))
            freq_hist_lines_area.selectAll("svg")
                .filter(function(x) { return self != this; })
                .transition()
                .duration(200)
                .style("opacity", 1.0)
    })

}

/**
 * Returns the width of an element based on its start and end frequencies
 * @param {*} start The start frequency
 * @param {*} end The end frequency
 * @returns The width in pixels
 */
function getWidth(start, end)
{
    // this allows us to get the width of any number smaller than minF
    if(arguments.length == 1)
        return freq_hist_xScale(start) - freq_hist_xScale(0)
    return freq_hist_xScale(end) - freq_hist_xScale(start)
}

/**
 * Removes frequency datapoints that are not covered by any observation
 * @param {*} freq_array The frequency array
 * @returns The cleaned frequency array
 */
function removeEmpty(freq_array)
{
    return freq_array.filter((d) => {return d.observations.length != 0})
}

