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

        xml += "</log>";

        return xml;
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
