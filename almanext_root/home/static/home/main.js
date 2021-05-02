$(function()
{
    loadObservationTable()
})

function loadObservationTable()
{/*
    $('#obs-list thead tr').clone(true).appendTo('#obs-list thead');
    $('#obs-list thead tr:eq(1) th').each(function(i) 
    {
        $(this).html('<input type="text" />');
 
        $('input', this).on('keyup change', function() 
        {
            if (table.column(i).search() !== this.value) 
            {
                table.column(i).search(this.value).draw();
            }
        });
    })
*/
    $('#obs-list').DataTable( 
    {
        scrollX: true,
        scrollY: "180px",
        lengthChange: false,
        searching: false,
        info: false,
        orderClasses: false,
        asStripeClasses: [""],
        orderCellsTop: true,
    }
    ).columns.adjust().draw();
}