// Generate link anchors for all headlines.
$('h2,h3,h4,h5,h6').filter('[id]').each(function () {
    $(this).html('<a href="#'+$(this).attr('id')+'">' + $(this).text() + '</a>');
});

// show wip articles
$(document).ready(function() {
    if (location.hash.indexOf("wip") != -1) {
        $(".wip-post").show();
    }
});