var obs_table
/**
 * Creates a HTML list containing the observations
 */
export function showObservationList(data)
{
    //showListControlPane()
    console.log(data.observations)
    obs_table = $('#obs_list').DataTable( 
    {
        data: data.observations,
        columns: [
            { "data": "project_code"},
            { "data": "source_name" },
            { "data": "ra" },
            { "data": "dec" },
            { "data": "total_area" },
            { "data": "overlap_area" }
        ],
        "scrollY": "35vh",
        "paging": false,
        "searching": false,
        "info": false,
        "orderClasses": false,
        "asStripeClasses": [""],
        "pageResize": true
    } 
    ).columns.adjust().draw();

    var container = $("#observations-table")
    container.find(".dataTables_scrollBody").css('height', container.height() - 20);
}

export function getObservationRowData(tr)
{
    return obs_table.row(tr).data()
}

export function updateObservationList(data)
{
    obs_table.clear();
    obs_table.rows.add(data.observations).draw()
}

export function updateListSelectedObs(obs_list)
{
    // remove all row highlights
    obs_table.rows().every(function() 
    {
        this.nodes().to$().removeClass('selected')
    })
    if(obs_list != null)
    {
        var id_list = []
        for (var i = 0; i < obs_list.length; i++)
        {
            id_list.push(obs_list[i])
        }
        obs_table.rows().every(function() 
        {
            var rowData = this.data();
            if(id_list.includes(rowData.index))
                $(this.node()).addClass('selected');
        })
    }
}

export function showListControlPane()
{
    $("#observations-table").append(`<button class='ui-button ui-widget ui-corner-all submit-button' type='button'> 
        Download data
        <i class="fas fa-download" aria-hidden="true"></i></button>`)

}

