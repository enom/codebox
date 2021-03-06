define([
    'jQuery',
    'underscore'
], function ($, _) {
    return {
        show: function(p, message) {
            $(".cb-loading-alert").show();

            if (_.isString(p)) {
                message = p;
                p = null;
            }

            if (message) {
                $(".cb-loading-alert .cb-loading-message").html(message);
            }

            if (p) {
                p.fin(function() {
                    $(".cb-loading-alert").hide();
                    $(".cb-loading-alert .cb-loading-message").html("");
                });
            }
            
            return p;
        },
        stop: function() {
            $(".cb-loading-alert").hide();
            $(".cb-loading-alert .cb-loading-message").html("");
        }
    };
});