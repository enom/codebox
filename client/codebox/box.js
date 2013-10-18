define([
    'hr/hr',
    'vendors/socket.io',
    'codebox/file',
    'codebox/shell'
], function (hr, io, File, Shell) {
    var logging = hr.Logger.addNamespace("codebox");

    var Codebox = hr.Class.extend({
        defaults: {
            baseUrl: "",
            vBaseUrl: "",
            listenEvents: true
        },

        /*
         *  Client interface to a codebox
         */
        initialize: function() {
            this.baseUrl = this.options.baseUrl;
            this.vBaseUrl = this.options.vBaseUrl;
            this.state = false;

            // Accept workspace option
            if (this.options.workspace != null) {
                this.workspace = this.options.workspace;

                this.workspace.on("set", _.partial(this.useWorkspace, this.workspace), this);
                this.useWorkspace();
            }

            // Root file
            this.root = new File({
                codebox: this
            });
            this.root.getByPath("/");
            return this;
        },

        /*
         *  Subscribe to events from codebox using socket.io
         */
        listenEvents: function() {
            var that = this;

            this.socket("events").done(function(socket) {
                socket.on('event', function(data) {
                    var eventName = "box:"+data.event.replace(/\./g, ":");
                    that.trigger(eventName, data);
                });
                socket.on('connect', function(data) {
                    that.setStatus(true);
                });
                socket.on('connect_failed', function(data) {
                    that.setStatus(false);
                });
                socket.on('reconnect', function(data) {
                    that.setStatus(true);
                });
                socket.on('reconnect_failed', function(data) {
                    that.setStatus(true);
                });
                socket.on('error', function(data) {
                    that.setStatus(false);
                });
                socket.on('disconnect', function(data) {
                    that.setStatus(false);
                });
            });
        },

        /*
         *  Use workspace to configure this codebox
         */
        useWorkspace: function(workspace) {
            this.workspace = workspace || this.workspace;
            this.baseUrl = this.workspace.get("codebox.url");
            this.vBaseUrl = this.workspace.path().slice(1);

            if (this.options.listenEvents) {
                this.listenEvents();
            }
            return this;
        },

        /*
         *  Set codebox status (working or not)
         *  
         *  @status : boolean for the status
         */
        setStatus: function(status) {
            this.status = status;
            logging.log("status ", this.status);
            this.trigger("status", status);
        },

        /*
         *  Execute a request
         *
         *  @param mode : mode "get", "post", "getJSON", "put", "delete"
         *  @param method : url for the request
         *  @args : args for the request
         */
        request: function(mode, method, args, options) {
            return hr.Requests[mode](this.baseUrl+method, args, options);
        },

        /*
         *  Execute a rpc request
         *
         *  @param method to call
         *  @args : args for the request
         */
        rpc: function(method, args, options) {
            var d = new hr.Deferred();
            this.request("getJSON", method, args, options).done(function(data) {
                if (!data.ok) { d.reject(data.error); }
                else { d.resolve(data.data); }
            }, function() { d.reject(); });

            return d;
        },

        /*
         *  Return url for socket.io connexions
         */
        socketUrl: function() {
            if (this.baseUrl == null) return null;
            return this.baseUrl.slice(1)+"/socket.io";
        },

        /*
         *  Return full-namespace for a codebox namespace
         */
        socketNamespace: function(namespace) {
            return namespace;
        },

        /*
         *  Socket for the connexion
         *
         *  @namespace : namespace for the socket
         *  @forceCreate : force creation of a new socket
         */
        socket: function(namespace, forceCreate) {
            var d = new hr.Deferred();
            if (this.socketUrl() == null) {
                d.reject();
            } else {
                var socket = io.connect([window.location.protocol, '//', window.location.host].join('')+"/"+this.socketNamespace(namespace), {
                    'resource': this.socketUrl(),
                    'force new connection': forceCreate
                });

                d.resolve(socket);
            }

            return d;
        },

        /*
         *  Join the box
         */
        join: function(args) {
            var that = this;
            args = args || {};
            return this.request("post", "/auth/join", args);
        },

        /*
         *  Get box status
         */
        status: function() {
            return this.request("getJSON", "/");
        },

        /*
         *  Ping the codebox, the user is still here
         */
        ping: function() {
            return this.rpc("/auth/ping");
        },

        /*
         *  Get list of collaborators
         */
        collaborators: function() {
            return this.rpc("/users/list");
        },

        /*
         *  Get git status
         */
        gitStatus: function() {
            return this.rpc("/git/status");
        },

        /*
         *  Get git changes
         */
        changes: function() {
            return this.rpc("/git/diff_working");
        },

        /*
         *  Get commits chages
         */
        commitsPending: function() {
            return this.rpc("/git/commits_pending");
        },

        /*
         *  Search files
         */
        searchFiles: function(q) {
            return this.rpc("/search/files", {
                "query": q
            });
        },

        /*
         *  Commit to the git workspace
         */
        commit: function(args) {
            var that = this;
            args = _.extend(args || {});
            return this.rpc("/git/commit", args);
        },

        /*
         *  Sync (pull & push) the git workspace
         */
        sync: function(args) {
            var that = this;
            args = _.extend(args || {}, {});
            return this.rpc("/git/sync", args);
        },

        /*
         *  Open a shell
         */
        openShell: function(args) {
            args = args || {};
            args.codebox = this;
            return new Shell(args);
        },

        /*
         *  Return an http proxy url
         */
        proxyUrl: function(url) {
            return this.baseUrl+"/proxy/"+encodeURIComponent(url);
        },
    });
    return Codebox;
});