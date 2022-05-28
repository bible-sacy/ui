(function() {
    var clipboard = new ClipboardJS('#permalink');

    clipboard.on('success', function(e) {
        e.clearSelection();
    });
})()