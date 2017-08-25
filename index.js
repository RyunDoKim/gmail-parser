/**
 * Created by RyunDo Kim<ryundokim@gmail.com> on 2017. 8. 4.
 * @author RyunDo Kim(dodo)
 * @licence MIT License
 Copyright (c) <2017> <RyunDo Kim>
 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 */

const quotedPrintable = require("quoted-printable");
const Iconv = require("iconv").Iconv;
const DATE_REGEX = /\n(Date):\s([^\n\r]+?)\r?\n/i;
const FROM_REGEX = /\n(From):\s([^\n\r]+?)\r?\n/i;
const TO_REGEX = /\n(To):\s([^\n\r]+?)\r?\n/i;
const REPLY_TO_REGEX = /\n(Reply-To):\s([^\n\r]+?)\r?\n/i;
const CC_REGEX = /\n(CC):\s([^\n\r]+?)\r?\n/i;
const MIME_VERSION_REGEX = /\n(Mime-Version):\s([^\n\r]+?)\r?\n/i;
const SUBJECT_REGEX = /\n(Subject):\s((=\?[\s\S]+\?=)|([^\n\r]+))/i;
const TITLE_ENCODING_REGEX = /=\?(.*?)\?([BQ])\?([\S]+?)\?=/gi;
const CONTENT_TYPES_REGEX = /\n(Content-Type):\s([^;\s]*?([;\s]+[^:\s]+)?)\s+/i;
const CONTENT_TYPE_ATTRIBUTE_REGEX = /([^=;\s]+)="?([^;"\s]+)"?;?/gi;
const CONTENT_TYPE_REGEX = /([^;\s]+);?/i;
const CONTENT_TRANSFER_ENCODING_REGEX = /\n(Content-Transfer-Encoding):\s([^;\s]*)\s/i;
const CONTENT_REGEX = /(?:\r?\n){2,}([\s\S]+)/i;


/**
 * @class Mail
 * @typedef {object} Mail
 * @version 0.0.1
 * @description A class contains properties of parsed mail. All property names are lowercase. (ex. content-type, messageid)
 * @description 문자열 메일을 파싱한 결과가 담길 객체 클래스입니다. 속성 식별자는 모두 소문자입니다. (ex. content-type, messageid)
 * @property {string} messageid messageId Gmail messageId, not a messageId in raw  mail, it is retrievable through gmail.users.messages.list) method.
 * gmail의 메세지 아이디입니다.  원형 데이터의 것이 아닌 gmail.users.messages.list로 구할 수 있는 아이디입니다.
 * @property {string|Array} content If the Content-Type of mail is multipart, this will be an Array of sub mails(Mail object which hold each parsed content information), if not, this will be a string
 * multipart일 경우 여러 메일의 배열을 갖게 되며 그렇지 않을경우 보통의 경우 문자열입니다
 **/
class Mail {
    constructor(messageId) {
        this.messageid = messageId;
    }
}


/**
 * @description Parse raw  mail. Returns Mail object which contains parsed information.
 * 문자열의 메일을 (rawMail)을 분석해 전달받은 Mail 객체에 해당 분석 정보를 담습니다.
 * @param {string} rawMail Decoded raw  mail data. (decoded by base64url).
 * 디코딩된 문자열 메일입니다. base64url로 디코드 되었습니다
 * @param {string} messageId Gmail messageId, not a messageId in raw  mail, it is retrievable through gmail.users.messages.list) method.
 * mail 문자열 메일을 분석해 정보를 담을 객체입니다.
 * @param {function} callback Callback when got an error. Params are error and Mail object.
 * 에러 발생시 호출될 콜백. 에러와 함께 만들고 있던 Mail 객체를 전달합니다.
 * @returns {Mail} Return Mail object containing parsed information.
 * 분석 결과를 담고 있는 Mail 객체를 반환합니다.
 **/
function parseToMailObj(rawMail, messageId, callback) {
    "use strict";
    let mail = new Mail(messageId);
    try {
        execRegEx(rawMail, DATE_REGEX, mail);
        execRegEx(rawMail, TO_REGEX, mail);
        execRegEx(rawMail, REPLY_TO_REGEX, mail);
        execRegEx(rawMail, CC_REGEX, mail);
        execRegEx(rawMail, MIME_VERSION_REGEX, mail);
        execRegEx(rawMail, FROM_REGEX, mail);
        execRegEx(rawMail, SUBJECT_REGEX, mail);
        arrangeHeaders(mail);
        parseContent(rawMail, mail);
    } catch (e) {
        callback(e, mail, rawMail);
    }
    return mail;
}
/**
 * @description Arrange parsed information. Decode values if needed.
 * 객체의 정보를 정리합니다.
 */
function arrangeHeaders(mail) {
    mail.fromname = decodeTitle(mail.from);
    mail.fromaddress = /<(.*)>/i.exec(mail.from);
    mail.fromaddress = (mail.fromaddress !== null) ? mail.fromaddress[1] : mail.fromname;
    mail.from = `\"${mail.fromname}\" <${mail.fromaddress}>`;
    mail.subject = decodeTitle(mail.subject);
}
/**
 * @description Decode subject of mail or title of attached file.
 * 메일의 제목 또는 첨부파일의 이름을 디코딩합니다.
 * @param title {string} subject of mail or title of attached file.
 * 메일의 제목 또는 첨부파일의 이름
 * @return {string} If decodable, it return decoded or the original title.
 * 디코딩할 수 있다면 디코딩된 값을 그렇지 않다면 기존 문자열을 반환합니다
 **/
function decodeTitle(title) {
    "use strict";
    let temp = "";
    let result = TITLE_ENCODING_REGEX.exec(title);
    while (result !== null) {
        temp += decodeByEncoding(result[3], result[2], result[1].toUpperCase());
        result = TITLE_ENCODING_REGEX.exec(title)
    }
    return (temp.length > 0) ? temp : title;
}
/**
 * @description Parse content. Parsed content will be contained the assigned Mail object (mail)
 * 문자열의 메일 본문을 (content) 분석해 전달받은 객체(mail)의 content에 분석 정보를 담습니다
 * @param {string} content, will be parsed.
 * content 분석할 문자열의 메일 본문(또는 첨부파일)입니다.
 * @param {Mail} mail A Mail object. This will contain parsed content information.
 * mail 분석 결과를 담을 객체입니다.
 * @return {Mail} Return the Mail object.
 * 분석 결과를 담은 Mail 객체를 반환합니다.
 **/
function parseContent(content, mail) {
    "use strict";
    execRegEx(content, CONTENT_TYPES_REGEX, mail);
    parseContentType(mail);
    let contentType = mail["content-type"];
    if (contentType.type.match("multipart/")) {
        mail.content = splitMultipartContent(content, mail);
    } else if (contentType.type.match("text/")) {
        if (execRegEx(content, CONTENT_TRANSFER_ENCODING_REGEX, mail)) {
            content = CONTENT_REGEX.exec(content)[1];
            content = decodeByEncoding(content, mail["content-transfer-encoding"], mail["content-type"].charset);
        }
        mail.content = content;
    } else {
        content = CONTENT_REGEX.exec(content)[1];
        mail.content = content;
    }
    return mail;
}

/**
 * @description  Parse string content-type information and make a object to hold that. If it has sub attributes (ex. charset, boundary), these will be each property of the object
 * parseContentType 으로 타입 정보 외에 여러 요소를 갖고 있는 문자열의 content-type을 파싱해 객체로 만들어줍니다. 각각의 요소들은 객체의 속성이됩니다
 * @param {Mail} mail A Mail object.
 * 매일 객체입니다
 **/
function parseContentType(mail) {
    if (typeof mail["content-type"] !== "string") {
        return;
    }
    let contentType;
    let attr;
    contentType = {type: CONTENT_TYPE_REGEX.exec(mail["content-type"])[1]};
    while ((attr = CONTENT_TYPE_ATTRIBUTE_REGEX.exec(mail["content-type"])) !== null) {
        contentType[attr[1]] = decodeTitle(attr[2]);
    }
    mail["content-type"] = contentType;
}

/**
 * @description Parse string using Regular Expressions and compose mail object using the result.
 * RegExp를 이용해 문자열을 분석하고 결과에 맞춰 Mail 객체를 구성합니다
 * @param {string} rawMail Raw mail
 * 분석되지 않은 메일
 * @param {RegExp} regEx Regular Expressions to parse raw mail.
 * 분석을 위한 정규표현식
 * @param {Mail} mail Mail object to hold parsed information.
 * 분석된 결과를 담을 객체
 * @returns {Array} Return the result of Regular Expression execution(RegExp.exec()). Null means the parsing fails.
 * 정규표현식 결과를 반환합니다. Null은 분석의 실패를 의미합니다
 **/
function execRegEx(rawMail, regEx, mail) {
    "use strict";
    let result = regEx.exec(rawMail);
    if (!result) {
        return null;
    }
    composeMail(result, mail);
    return result;
}

/**
 * @description Compose Mail object using Regular Expression result. All property names are lowercase.
 * RegEx 결과값을 이용해 Mail 객체를 구성합니다. 속성 식별자는 모두 소문자입니다
 * @param {Array} regExResult Regular Expression result. (RegExp.exex())
 * 정규표현식 결과입니다
 * @param {Mail} mail Mail object to hold parsed information.
 * 분석된 정보를 가지고 있는 Mail 객체입니다
 **/
function composeMail(regExResult, mail) {
    "use strict";
    let tag = "";
    for (let idx = 0; idx < regExResult.length; idx++) {
        if (regExResult[idx] === undefined) {
            continue;
        }
        if (idx % 3 === 1) {
            tag = regExResult[idx].toLowerCase();
        } else if (idx % 3 === 2) {
            mail[tag] = regExResult[idx].trim();
        }
    }
}

/**
 * @description Split multipart type content by boundary and parse content. Each split and parsed content will be a Mail object and stored in an Array.
 * multipart 타입의 본문을 분할합니다. mail에 저장된 boundary를 사용합니다. 그후 본문을 분할된 본문을 각각 파싱해 객체에 저장합니다. 저장된 분할된 본문은 각각 하나의 Mail객체로 배열에 저장됩니다
 * @param {string} rawMail raw mail
 * 분석될 메일입니다.
 * @param {Mail} mail Mail object to hold parsed information. the property "content-type" will be an Array. In some cases it can be multi-dimensional (especially has attached file).
 * 분석된 결과를 담을 객체입니다 "content-type"은 배열이됩니다. 경우에 따라 다차원이 될 수 있습니다. (첨부파일이 있는 경우 특히 그러합니다).
 * @returns {Array} Return the array containing split contents(Mail object).
 * 분할되어 각긱 하나의 메일로 분석된 객체들을 갖고 있는 배열을 반환합니다
 **/
function splitMultipartContent(rawMail, mail) {
    "use strict";
    let boundary = "--" + mail["content-type"].boundary;
    let subs = rawMail.split(boundary);
    let contents = [];
    subs.shift();
    subs.pop();
    subs.forEach((sub) => {
        let subMail = new Mail(mail.messageid);
        for (let property in mail) {
            if (!mail.hasOwnProperty(property)) {
                continue;
            }
            subMail[property] = mail[property];
        }
        contents.push(parseContent(sub, subMail));
    });
    return contents;
}

/**
 * @description Decode raw data as encoded way.
 * 인코딩된 방식에 따라 디코딩합니다.
 * @param {string} raw Encoded data.
 * 인코딩된 데이터입니다
 * @param {string} encodingOption Encoding option.
 * 인코딩 방식입니다
 * @param {string} charset of the encoding. If null, it will be UTF-8;
 * 문자집합 이름입니다. null의 경우 UTF-8로 처리됩니다
 * @returns {string} Return decoded data.
 * 디코딩된 데이터를 반환합니다.
 **/
function decodeByEncoding(raw, encodingOption, charset) {
    let buffer = null;
    switch (encodingOption) {
        case "B":
        case "base64":
            buffer = new Buffer(raw, "base64");
            break;
        case "Q":
        case "quoted-printable":
            buffer = new Buffer(quotedPrintable.decode(raw), "binary");
            break;
        case "binary": // 7bit, 8bit, binary
            buffer = new Buffer(raw, "binary");
            break;
        default :
            buffer = new Buffer(raw);
    }
    if (charset && !charset.match(/UTF-?8/i)) {
        if (charset.match(/KS_C_5601-1987/i)) {
            charset = "CP949";
        } else if (charset.match(/(KSC5601|KSC5636)/i)) {
            charset = "EUC-KR";
        }
        let iconv = new Iconv(charset, "UTF-8//TRANSLIT//IGNORE");
        buffer = iconv.convert(buffer);
    }
    return buffer.toString();
}

/**
 * @description Parse Gmail.raw into Mail object.
 * Gmail의 raw 데이터를 분석해 Mail 객체로 만듭니다
 * @param {object} rawMail the result of Gmail Api users.messages.get() with query param format: "raw".
 * 쿼리 인수로 format: "raw"를 사용한 Gmail Api users.messages.get() 응답 결과입니다
 * @param {function} callback Takes Error, Mail Object, and Decoded Raw String Email.
 * 에러, Mail 객체, 디코딩된 문자열의 메일 원본을 전달받는 콜백입니다
 * @returns {Mail} Return Parsed Mail object.
 */
exports.parseGmail = function (rawMail, callback) {
    let decodedRawMail = decodeByEncoding(rawMail.raw, "B");
    let mail = parseToMailObj(decodedRawMail, rawMail.id, callback);
    if (callback) {
        callback(null, mail, decodedRawMail);
    }
    return mail;
};
/**
 * @description Parse string raw Gamil into Mail object.
 * 문자열의 Gmail을 분석해 Mail객체로 만듭니다
 * @param {string} stringMail String raw Gmail. Value of Gmail.raw
 * Gmail.raw의 값인 문자열로된 메일정보입니다
 * @param {string} messageId Gmail messageId which used as a query param on users.messages.get() method.
 * Gmail Id입니다.
 * @param {function} callback Takes Error, Mail Object, and Decoded Raw String Email.
 * 에러, Mail 객체, 디코딩된 문자열의 메일 원본을 전달받는 콜백입니다
 * @returns {Mail} Return Parsed Mail object.
 */
exports.parseStringGmail = function (stringMail, messageId, callback) {
    let decodedRawMail = decodeByEncoding(stringMail, "B");
    let mail = parseToMailObj(decodedRawMail, messageId, callback);
    if (callback) {
        callback(null, mail, decodedRawMail);
    }
    return mail;
};