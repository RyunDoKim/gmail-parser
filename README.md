# gmail-parser

Parse raw Gmail into a Mail object. Raw mail is retrieved by using Gmail API 'messages.get()' with query param "format" : 'raw' 
* Tested with 5000 mails. 
* This is for a 'RAW' Gmail which is retrievable by using Gmail API ['gmail.users.messages.get'](https://developers.google.com/gmail/api/v1/reference/users/messages/get?hl=ko)
with 'format :raw' query param.
* Attached File will be returned as raw. Check 'Content Type(content-type of Mail object)' to use it. 
* Use Iconv to support non UTF-8 charset.  
***NOTE***  If your mail have charset which Iconv does not support, It will emmit an error.  
***NOTE*** Charset 'KS_C_5601-1987' will be decoded as 'CP949'. Charset 'KSC5601' and 'KSC5636' will be decoded as EUC-KR. (yes, I am Korean)

## Installation

`npm install gmail-parser`

## Usage

#### parseGmail(rawMail,callback)
Parse Gmail.raw into a Mail object. 

***rawMail*** : Response from Gmail API  ['gmail.users.messages.get'](https://developers.google.com/gmail/api/v1/reference/users/messages/get?hl=ko) with 'format :raw' query param.  
***callback*** : Will get error and mail. Even on error, it will take mail imperfectly.

```javascript
const gmailParser = require('gmail-parser');

gmailParser.parseGmail(rawMail,(err, mail)=>{
    if(err){
        console.error(err); 
        console.log(mail) //Imperfect, but at least it contains the messageId.
    }
    console.dir(mail);
});

let mail = gmailParser.parseGmail(rawMail);
```

* Example
```javascript

const gmailParser = require('gmail-parser');
gmail.users.messages.get({auth:OAuth2, userId:'me', id:messageId, format:'raw'},(err, rawMail)=>{
    gmailParser.parseGmail(rawMail,callback);
    //or let mail = gmailParser.parseGmail(rawMail);
    //doSomething(mail);
})
```
#### parseStringGmail(stringMail, messageId ,callback)
Takes String type raw Gmail. 
The value of property 'raw' of response from Gmail API users.messages.get() Method.

***stringMail*** : Value of property 'raw' of response from Gmail API  ['gmail.users.messages.get'](https://developers.google.com/gmail/api/v1/reference/users/messages/get?hl=ko) with 'format :raw' query param.  
***messageId*** : Gmail messageId. You can use your own custom Id for the Mail object. 
***callback*** : Will get error and mail. Even on error, it will take mail imperfectly.

```javascript
const gmailParser = require('gmail-parser');

gmailParser.parseStringGmail(stringMail, messageId ,(err, mail)=>{
    if(err){
        console.error(err);
        console.log(mail) //Imperfect, but at least it contains the messageId.
    }
    console.dir(mail);
});

let mail = gmailParser.parseGmail(StringMail, messageId);
```

* Example
```javascript

const gmailParser = require('gmail-parser');
gmail.users.messages.get({auth:OAuth2, userId:'me', id:messageId, format:'raw'},(err, rawMail)=>{
    gmailParser.parseStringGmail(rawMail.raw,rawMail.id,callback);
    //or let mail = gmailParser.parseGmail(rawMail.raw, messageId);
    //or let mail = gmailParser.parseGmail(rawMail.raw, messageId);
    //doSomething(mail);
})
```
* Case when you want to impose your own custom id. 

```javascript

const gmailParser = require('gmail-parser');
gmail.users.messages.get({auth:OAuth2, userId:'me', id:messageId, format:'raw'},(err, rawMail)=>{
    gmailParser.parseStringGmail(rawMail.raw, customId, callback);
    //or let mail = gmailParser.parseGmail(rawMail.raw, customId);
    //doSomething(mail);
})
```
## Mail

* Mail is an object holding parsed information.
* It has the header information as it's property.  
***Note*** The name(identifier) of properties are all lower case.
* Most of properties it has are string type.
* 'Content-Type' should be a object which has 'type' property (ex. text/plain) and each attributes this header has.
* Depends of the 'Content-type' ('content-type' in object), the content can be either string or array.

* Content as string
```javascript
console.log(mail.content);
```
```javascript
{
  "messageid": "15da1a51245c12a2d",
  "date": "Wed, 9 Aug 2017 00:00:01 +0900",
  "from": "sample from <from@sample.com>",
  "fromname": "sample from",
  "fromaddress": "from@sample.com",
  "subject": "sample subject",
  "to": "to@sample.com",
  "content-type": {
    "type": "text/plain",
    "charset": "utf-8"
  },
  "content-transfer-encoding": "base64",
  "content": "sample content",
}
```

* Content as Array  
***Content can be an array when the content-type is 'multipart' each part is parsed into a Mail object. Sometimes you will see dual multiparts***
```javascript
mail.forEach((content)=>{
        console.log(content);
    });
```

```javascript
{   "messageid": "15dc1377342ea701",
    "date": "Wed, 9 Aug 2017 00:00:01 +0900",
    "from": "sample from <from@sample.com>",
    "fromname": "sample from",
    "fromaddress": "from@sample.com",
    "subject": "sample subject",
    "to": "to@sample.com",
    "reply-to": "sample.com <replyto@sample.com>",
    "cc": "cc@sample.com <cc@sample.com>",
    "mime-version": "1.0",
    "content-type": {
      "type": "multipart/alternative",
      "boundary": "b2f86160fec5cb3eefd91aa29693ad5b8d25b6a836e0f64748b5aeab6c7e"
    },
    "content": [
      {
        "messageid": "15dc1377342ea701",
        "date": "Wed, 9 Aug 2017 00:00:01 +0900",
        "from": "sample from <from@sample.com>",
        "fromname": "sample from",
        "fromaddress": "from@sample.com",
        "subject": "sample subject",
        "to": "to@sample.com",
        "reply-to": "sample.com <replyto@sample.com>",
        "cc": "cc@sample.com <cc@sample.com>",
        "mime-version": "1.0",
        "content-type": {
          "type": "text/plain",
          "charset": "UTF-8"
        },
        "content-transfer-encoding": "quoted-printable"
        "content": "inner content 1"
      },
      {
        "messageid": "15dc1377342ea701",
        "date": "Wed, 9 Aug 2017 00:00:01 +0900",
        "from": "sample from <from@sample.com>",
        "fromname": "sample from",
        "fromaddress": "from@sample.com",
        "subject": "sample subject",
        "to": "to@sample.com",
        "reply-to": "sample.com <replyto@sample.com>",
        "cc": "cc@sample.com <cc@sample.com>",
        "mime-version": "1.0",
        "content-type": {
          "type": "multipart/alternative",
          "boundar": "123112cbab4ca812ba1231412bcaccab12314231eea"
        },
        "content": [...]
      }
    ]
    }
```

## License
 MIT License
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
