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
var left_axis = "obs_count"
var datatype = "hist"

export function showFreqHistogram(plot_properties, plot_freqs, emission_lines)
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
        </div>
        <div id="freq-histogram-controls" class='histogram-controls-wrapper'>
        </div>
    </div>`
    //margin = 5;
    
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
    datasets["lod" + log_length] = plot_freqs
}

function freqHistZoomed(transform)
{
    if(transform != undefined)
    {
        freq_hist_transform_store = transform
    }
    var new_xScale = freq_hist_transform_store.rescaleX(freq_hist_xScale)
    updateVisibleBars(new_xScale)
    /*drawArea.selectAll("rect")
        .attr("transform", "translate(" + transform_store.x+",0)scale(" + transform_store.k + ",1)")*/
    /*drawArea.selectAll("path")
        .attr("transform", "translate(" + transform_store.x+",0)scale(" + transform_store.k + ",1)")*/
    freq_hist_svg.selectAll("#x-axis").call(freq_hist_xAxis.scale(freq_hist_transform_store.rescaleX(freq_hist_xScale)));
    freq_hist_lines_area.selectAll("svg")
        .attr("x", function(l) {return(new_xScale(l.frequency/(1+z)))})
}

function updateVisibleBars(new_xScale)
{
    var zoom_level = Math.round(Math.log10(freq_hist_transform_store.k) + 1)
    var dataset = datasets["lod" + zoom_level]
    drawBarsByDomain(new_xScale, dataset)
}

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
            .on("click", function(f) { return getObsFromSet(f)})

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
    }
}

export function updateFreqHistogram(plot_properties, plot_freqs, emission_lines)
{
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
    
    // redraw the CS graph
    //drawCSPoints(plot_freqs)
    //drawFreqObsBars(plot_freqs)
    buildDatasets(plot_freqs)
    drawEmissionLines(emission_lines)
    freqHistZoomed()
}

export function highlightFreqHistogram(pixel_obs)
{
    freq_hist_draw_area.selectAll('rect').attr("class", "freq-histogram-obs-bar")
    if(pixel_obs != null)
    {
        freq_hist_draw_area.selectAll('rect').each(function() {
            var rect = d3.select(this)
            var rect_obs = rect.attr("observations")
            var bar_obs = rect_obs.split(",").map(Number)
            pixel_obs.some(function(obs)
            {
                var index = obs.index
                if(bar_obs.includes(index))
                {
                    rect.attr("class", "freq-histogram-obs-bar highlight")
                    return true
                }
                else
                    rect.attr("class", "freq-histogram-obs-bar")
            })
        })
    }
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

function drawFreqObsBars(plot_freqs)
{
    freq_hist_draw_area.selectAll('rect').remove()
    
    freq_hist_draw_area.selectAll('rect')
        .data(removeEmpty(plot_freqs))
        .enter()
        .append('rect')
            .attr("type", "static")
            .attr("observations", function(f) { return f.observations})
            .attr("x", function(f) { return freq_hist_xScale(f.freq)})
            .attr("y", function(f) { return freq_hist_yScale1(f.observations.length) + freq_hist_margin.top})
            .attr("width", function() { return getWidth(bucket_size)})
            .attr("height", function(f) { return freq_hist_height - freq_hist_margin.top - freq_hist_margin.bottom - freq_hist_yScale1(f.observations.length)})
            .attr("class", "freq-histogram-obs-bar")
}

export function drawEmissionLines(emission_lines)
{
    freq_hist_lines_area.selectAll("svg").remove()
    // only render those lines that fall inside the frequency interval
    var visible_lines = emission_lines.filter((em) => {return(em.frequency/(1+z) > minF && em.frequency/(1+z) < maxF)})
    // create a group to place the emission lines
    var em_lines_g = freq_hist_lines_area.selectAll("svg")
        .data(visible_lines)
    createLinesSVG(em_lines_g)
}

export function changeAxisData()
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

// gets the average value in a bin for the currently selected property
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

// returns the list of all observations included in a bin
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
                <div id="freq-histogram-redshift" class="freq-histogram-slider-range"></div>
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
        .attr("y2", "200")
        .attr("x2", "5")
        .attr("y1", "75")
        .attr("x1", "5")
        .attr("stroke-width", "2")
        .attr("fill", "none")

}

// returns the width of a given element given its start and end values
function getWidth(start, end)
{
    // this allows us to get the width of any number smaller than minF
    if(arguments.length == 1)
        return freq_hist_xScale(start) - freq_hist_xScale(0)
    return freq_hist_xScale(end) - freq_hist_xScale(start)
}

function removeEmpty(freq_array)
{
    return freq_array.filter((d) => {return d.observations.length != 0})
}

