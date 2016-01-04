/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

var prefDomain = "extensions.firebug.consoleexport";

// ************************************************************************************************
// Module implementation

/**
 * This object represents Console panel listener that listens for Console panel logs
 * and uses {@link Firebug.ConsoleExport.Uploader} to upload them to a specified server.
 */
Firebug.ConsoleExport.Listener =
/** @lends Firebug.ConsoleExport.Listener */
{
    registered: false,

    register: function()
    {
        if (!this.registered)
        {
            Firebug.Console.addListener(this);
            Firebug.Profiler.addListener(this);
        }
    },

    unregister: function()
    {
        if (this.registered)
        {
            Firebug.Console.removeListener(this);
            Firebug.Profiler.removeListener(this);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Console listener

    log: function(context, object, className, sourceLink)
    {
        object = unwrapObject(object);

        if (FBTrace.DBG_CONSOLEEXPORT)
        {
            FBTrace.sysout("consoleexport.Console.Listener.log; " +
                className, object);
        }

        try
        {
            var message = null;

            if (typeof object == "string")
                message = object;
            else
                message = object.message;
            if(className == "spy")
            {
                message = object.method + " " + object.href;
                var newObject = {
                    href: object.href,
                    cat: object.category,
                    source: object.source,
                    lineNo: object.sourceLink.href,
                    source: object.sourceLink.line
                }
                object = newObject;
            }

            var url = Firebug.getPref(prefDomain, "serverURL");
            var path = Firebug.getPref(prefDomain, "logFilePath");
            if (url) {
               Firebug.ConsoleExport.Uploader.send({
                    className: className,
                    cat: object.category,
                    msg: message,
                    href: object.href ? object.href : context.getName(),
                    lineNo: object.lineNo,
                    source: object.source,
                });
            }
            if (path) {
                Firebug.ConsoleExport.Dumper.dump({
                    className: className,
                    cat: object.category,
                    msg: message,
                    href: object.href ? object.href : context.getName(),
                    lineNo: object.lineNo,
                    source: object.source,
                    time: new Date().getTime()
                });
            }
        }
        catch (err)
        {
            if (FBTrace.DBG_CONSOLEEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("consoleexport.Console.Listener.log; EXCEPTION " + err, err);
        }
    },

    logFormatted: function(context, objects, className, sourceLink)
    {
        objects = unwrapObject(objects);

        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("consoleexport.Console.Listener.logFormatted; " +
                className, objects);

        //format console objects with patterned messages
        var message = this.formatConsoleObjects(objects);

        var url = Firebug.getPref(prefDomain, "serverURL");
        var path = Firebug.getPref(prefDomain, "logFilePath");
        if(url)
        {
            Firebug.ConsoleExport.Uploader.send({
                className: className,
                cat: "log",
                msg: message,
                href: context.getName(),
            });
        }
        if (path) {
            Firebug.ConsoleExport.Dumper.dump({
                className: className,
                cat: "log",
                msg: message,
                href: context.getName(),
                time: new Date().getTime()
            });
        }

    },

    /**
     * This method generates a formatted console message from a console objects array.
     * Formatted console message may include printf-like string substitution patterns.
     * In such cases, array's first element is the console message without substitutions.
     * Rest of array contains the parameters to be substituted in console message.
     *
     * Refer to {@Link https://getfirebug.com/wiki/index.php/Console.log#Parameters} for more info.
     */
    formatConsoleObjects: function(objects) {

        //empty array -> return empty string
        if(objects.length==0) {return "";}

        //console message does not include patterns (%) -> return original message
        if(objects.length==1) {return objects[0];}

        //handle console message with patterns
        var formattedMessage = objects[0]; //message with patterns
        var patternsParameters = Array.prototype.slice.call(objects,1); //patterns parameters
        //replace '%[a-z]' strings with their corresponding pattern parameters.
        for (var i = 0; i < patternsParameters.length; i++) {
            var patternParam = patternsParameters[i];
            //convert parameters objects to their JSON representation.
            if(typeof patternParam === 'object') {
                formattedMessage = formattedMessage.replace(/%[a-z]/, JSON.stringify(patternParam));
            }
            //other parameters do not need any special handling.
            else {
                formattedMessage = formattedMessage.replace(/%[a-z]/, patternParam);
            }
        }
        return formattedMessage;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Firebug Profiler listener

    startProfiling: function(context, title)
    {
        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("consoleexport.Console.Listener.startProfiling; " + title);

        // TODO: send to the server
    },

    stopProfiling: function(context, title, results, canceled)
    {
        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("consoleexport.Console.Listener.stopProfiling; " + title +
                (canceled ? " (canceled)" : ""), results);

        // TODO: send to the server
    },
};

// ************************************************************************************************
}});
