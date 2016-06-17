/**
 * Created by TooNies1810 on 6/14/16.
 */
var request = require('request');
var cheerio = require('cheerio');
var express = require('express');
var mysql = require('mysql');
var schedule = require('node-schedule');

var app = express();

// var bodyParser = require('body-parser');

var api_key_sendgrid = "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";
var url_host = "http://www.coltech.vnu.edu.vn";
var url_test = "http://www.coltech.vnu.edu.vn/news4st/test.php";

var form_post = {
    "lstClass": "820"
};

var param_post = {
    url: url_test,
    form: form_post
};

function crawler() {
    request.post(param_post, function (err, response, body) {
        // console.log(body);

        if (err) {
            res.end("Loi roi em ei");
            return;
        }

        if (res.statusCode === 200) {
            var $ = cheerio.load(body);

            var urlArr = [];
            urlArr = $('a');

            for (var i = 0; i < urlArr.length; i++) {
                var url_temp = url_host + urlArr[i].attribs.href.toString().trim().substring(2);
                // console.log(url_temp);

                var idClass = removeUndeline(getIdClass(url_temp));
                if (idClass.length > 0) {
                    // console.log(idClass);

                    var query = connection.query(
                        'UPDATE class SET ishasscore = ?, link = ? WHERE idclass = ?',
                        [true, url_temp, idClass],
                        function (err, results) {
                            // console.log("update ok");
                        });

                    // console.log(query.sql);
                }
            }
        }
    });
}

function removeUndeline(string) {
    string = string.toString().trim();
    return string.split('_').join('');
}

function getIdClass(url) {
    var urlString = url.toString();
    var url1 = urlString.split('-');
    // console.log(url1.toString());

    if (url1.length == 2) {
        return url1[1].substring(0, url1[1].length - 4);
    }

    if (url1.length > 2) {
        var tempUrl = url1[url1.length - 1];
        return tempUrl.substring(0, tempUrl.length - 4);
    }

    if (url1.length == 0) {
        url1 = urlString.split('/');
        var nameTemp = url1[url1.length - 1];
        return nameTemp.substring(0, nameTemp.length - 4);
    }

    return "";
}

// get post

app.get('/', function (req, res) {
    run();
    res.send('OK!');
});

function run() {
    crawler();
    checkToSendMail()
}

schedule.scheduleJob('*/5 * * * *', function () {
    run();
});


///////
function checkToSendMail() {
    // query lay emai, link -> gui mail thong bao
    var query_string = "SELECT u.email, u.name,c.name AS className, c.link, uc.idclass FROM user_class uc " +
        " JOIN user u ON u.email = uc.email" +
        " JOIN class c ON c.idclass = uc.idclass" +
        " WHERE uc.issendmail = false && c.ishasscore = true && u.isactive = true";

    connection.query(query_string, function (err, results) {
        if (err) {
            console.log("loi cmnr");
            return;
        }

        for (var i = 0; i < results.length; i++) {
            var email = results[i].email;
            var link = results[i].link;
            var idclass = results[i].idclass;
            var name = results[i].name;
            var className = results[i].className;

            sendNotiEmail(name, "fries.uet@gmail.com", email, className, link, function (err) {
                if (!err) {
                    // -> gui mail thanh cong -> update issend = true
                    var query = connection.query(
                        'UPDATE user_class SET issendmail = ? WHERE idclass = ?',
                        [true, idclass],
                        function (err, results) {
                            // console.log("update ok");
                        });
                }
            });
            console.log(results[i].email);
            console.log(results[i].link);
        }
    });

}

//// send mail

function sendNotiEmail(name, from, to, nameClass, links, callback) {

    var helper = require('sendgrid').mail;
    from_email = new helper.Email(from);
    to_email = new helper.Email(to);
    subject = "Thông báo có điểm " + nameClass;

    var link_html = "";
    link_html += " <a" + "href=" + links + ">" + links + "</a>" + "<br> ";
    // for (var i=0; i<links.length; i++){
    //    link_html += " <a" + "href=" + links[i] + ">" + links[i] + "</a>" + "<br> ";
    // }

    var content_html = "Xin chào " + name + "<br>" + "<br>" +
        "Đã có điểm của môn " + nameClass + " :" + "<br>" +
        "Link: " + link_html +
        "Chúc bạn một ngày vui vẻ :d" + "<br>" +
        "Fries Team.";

    content = new helper.Content("text/html", content_html);
    mail = new helper.Mail(from_email, subject, to_email, content);

    var sg = require('sendgrid').SendGrid("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");
    var requestBody = mail.toJSON();
    var request = sg.emptyRequest();
    request.method = 'POST';
    request.path = '/v3/mail/send';
    request.body = requestBody;
    sg.API(request, function (response) {
        // console.log(response.statusCode);
        // console.log(response.body);
        // console.log(response.headers);
        var err = true;
        if (response.statusCode == 202) {
            err = false;
            callback(err);
        } else {
            err = true;
            callback(err);
        }
    });
}


// connection

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'cBHdYiWf',
    database: 'score_uet'
});

connection.connect(function (err) {
    if (err) throw err;
    console.log("Connected to mysql!");

    app.listen(3456, function () {
        console.log("listening on 3456");
        // id 1
    });
});