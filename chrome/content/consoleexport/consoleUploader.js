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
 * This object implements sending messages to the server. The upload is based on XHR.
 * This object is also responsible for building XML or JSON messages.
 * 
 * Use "extensions.firebug.consoleexport.format" preference to specify whether
 * XML or JSON should be generated. Possible values are:
 * 
 * xml (default)
 * json
 */
Firebug.ConsoleExport.Uploader =
/** @lends Firebug.ConsoleExport.Uploader */
{
    send: function(data)
    {
        var format = Firebug.getPref(prefDomain, "format")
        var content = null;
        var contentType = "application/xml";

        if (format != null && format.toLowerCase() == "json")
        {
            contentType = "application/json";
            content = JSON.stringify(data);
        }
        else
        {
            content = this.buildPacket(data);
        }

        var url = Firebug.getPref(prefDomain, "serverURL");

        if (FBTrace.DBG_CONSOLEEXPORT)
        {
            FBTrace.sysout("consoleexport.Uploader.send; to: " +
                (url ? url : "no server URL specified"), content);
        }

        if (!url)
            return;

        this.delayedAjax({
            url: url,
            data: content,
            type: "POST",
            contentType: contentType,
            complete: function(request)
            {
                if (FBTrace.DBG_CONSOLEEXPORT)
                    FBTrace.sysout("consoleexport.Uploader.send; Log has been sent: " +
                        request.statusText, request.responseText);
            }
        });
    },

    buildPacket: function(data)
    {
        var xml = "<log>";

        if (data.className)
            xml += "<class>" + data.className + "</class>";

        if (data.cat)
            xml += "<cat>" + data.cat + "</cat>";

        if (data.msg)
            xml += "<msg><![CDATA[" + data.msg + "]]></msg>";

        if (data.href)
            xml += "<href>" + data.href + "</href>";

        if (data.lineNo)
            xml += "<lineNo>" + data.lineNo + "</lineNo>";

        if (data.source)
            xml += "<source>" + data.source + "</source>";

        if (data.time)
            xml += "<time>" + this.dateToJSON(new Date(data.time)) + "</time>";

        xml += "</log>";

        return xml;
    },

    dateToJSON: function (date){
        function f(n, c) {
            if (!c) c = 2;
            var s = new String(n);
            while (s.length < c) s = "0" + s;
            return s;
        }

        if(!(date instanceof Date)){
            date = new Date(date);
        }
        var result = date.getFullYear() + '-' +
            f(date.getMonth() + 1) + '-' +
            f(date.getDate()) + 'T' +
            f(date.getHours()) + ':' +
            f(date.getMinutes()) + ':' +
            f(date.getSeconds()) + '.' +
            f(date.getMilliseconds(), 3);

        var offset = date.getTimezoneOffset();
        var positive = offset > 0;

        // Convert to positive number before using Math.floor (see issue 5512)
        offset = Math.abs(offset);
        var offsetHours = Math.floor(offset / 60);
        var offsetMinutes = Math.floor(offset % 60);
        var prettyOffset = (positive > 0 ? "-" : "+") + f(offsetHours) + ":" + f(offsetMinutes);

        return result + prettyOffset;
    },

    delayedAjax: function(options)
    {
        var opt = options;
        setTimeout(function() {
            Firebug.ConsoleExport.Uploader.ajax(opt);
        }, 10);
    },

    ajax: function(options)
    {
        try
        {
            var request = CCIN("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
            request.open(options.type, options.url, true);
            request.setRequestHeader("Content-Type", options.contentType);
            request.setRequestHeader("Content-Length", options.data.length);
            request.onreadystatechange = function()
            {
                if (request.readyState == 4 && request.status == 200)
                {
                    if (options.complete)
                        options.complete(request);
                }
            }
            request.send(options.data);
        }
        catch (e)
        {
            if (FBTrace.DBG_CONSOLEEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("consoleexport.ajax; EXCEPTION " + e, e);
        }
    }
};

// ************************************************************************************************
}});
