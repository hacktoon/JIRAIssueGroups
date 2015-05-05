// ==UserScript==
// @name        JIRA GreenHopper Issue Groups
// @namespace   http://your.domain.com
// @match     https://your.jira.domain.com.br/*
// @version     1
// @run-at      document-start
// ==/UserScript==

var loaderIntervalId, $;
var issuesDataURL = '/rest/greenhopper/1.0/xboard/work/allData.json';
var rankURL = '/rest/greenhopper/1.0/rank';
var issueSelector = '.ghx-issue';
var groupClass = 'ghx-group';
var styleText = '.ghx-group { margin-bottom: 10px; padding: 2px; }';
    styleText += '.ghx-subtitle { background:rgba(0,0,0,0.7); text-align: center; color: #FFF; font-weight: bold; margin-bottom: 4px;}';
    styleText += '.ghx-closed .ghx-group { display: none; }';
var issueStatusCache = {};

var urlParam = function(name){
    var results = new RegExp('[\?&amp;]' + name + '=([^&amp;#]*)').exec(window.location.href);
    if (! results)
        return '';
    return results[1] || 0;
}

var groupIssuesByStatus = function(issues){
    issueStatusCache = {};
    for(var i=0, len=issues.length; i<len; i++){
        var issue = issues[i];
        var statusName = issue.statusName;
        var statusId = issue.statusId;
        var uniqueGroupSelector = groupClass + statusId;

        issueStatusCache[issue.key] = issue;

        var issueElem = $(issueSelector + "[data-issue-id='"+issue.id+"']");
        var issueColumn = issueElem.parents('.ghx-column');
        
        var group = issueColumn.find('.' + uniqueGroupSelector);
        // grupo ainda nao existe
        if (! group.length){
            var subtitle = $('<div/>')
                .html(statusName)
                .addClass('ghx-subtitle');

            group = $('<div/>')
                .addClass(uniqueGroupSelector)
                .addClass(groupClass)
                .append(subtitle)
                .css('background', issue.color);
            issueColumn.append(group);
        }
        issueElem.detach().appendTo(group);
    };
};

var getJsonData = function(text){
    var data = {};
    try {
        data = JSON.parse(text);
    } catch(err){
        console.log(err);
    }
    return data;
};

var interceptIssueDataRequest = function(url, responseText){
    // issue data loading
    if (url.indexOf(issuesDataURL) == -1 ){ return; }
    var data = getJsonData(responseText);
    if (data['issuesData']){
        var issues = data.issuesData.issues;
        if (issues.length){
            groupIssuesByStatus(issues);
        }
    } else {
        var issueList = [];
        console.log('refreshed');
        for (key in issueStatusCache){
            var issue = issueStatusCache[key];
            issueList.push(issue);
        }
        groupIssuesByStatus(issueList);
    }
};

var interceptRankRequest = function(url, responseText){
    // issue ranking (position switching)
    if (url.indexOf(rankURL) == -1 ){ return; }
    var data = getJsonData(responseText);
    var issueKey = data['rankBeforeKey'] || data['rankAfterKey'];
    if (issueStatusCache[issueKey]){
        var issueList = [];
        var issueElem = $(issueSelector + "[data-issue-key='"+issueKey+"']");
        var issuesInColumn = issueElem.parent().find(issueSelector);
        issuesInColumn.each(function(i, elem){
            var key = $(this).data('issue-key');
            var issue = issueStatusCache[key];
            issueList.push(issue);
        });
        groupIssuesByStatus(issueList);
    }
};

loaderIntervalId = setInterval(function(){
    if (typeof(AJS) == 'undefined'){ return; }
    $ = AJS.$;

    var style = $('<style/>').text(styleText);
    $('head').append(style);

    $(document).ajaxComplete(function( event, xhr, settings ) {
        interceptIssueDataRequest(settings.url, xhr.responseText);
    });

    $(document).ajaxSend(function( event, xhr, settings ) {
        interceptRankRequest(settings.url, settings.data);
    });
    clearInterval(loaderIntervalId);
}, 100);