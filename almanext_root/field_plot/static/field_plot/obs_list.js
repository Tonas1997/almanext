// the table object
export var obs_list
/**
 * Creates a HTML list containing the observations
 */
export function showObservationList(data)
{
    //var table_string = '<table id="obs_list" class="display" width="100%"></table>'
    //$('#tab-observations').html(table_string)
    console.log(data.observations)
    obs_list = $('#obs_list').DataTable( 
    {
        data: data.observations,
        columns: [
            { "data": "project_code"},
            { "data": "source_name" },
            { "data": "ra" },
            { "data": "dec" }
        ],
        "scrollY": "200px",
        "paging": false,
        "searching": false,
        "info": false
    } 
    ).columns.adjust().draw();
}

export function updateObservationList(data)
{
    console.log(data.observations)
    obs_list.clear();
    obs_list.rows.add(data.observations).draw()
}
