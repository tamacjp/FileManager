#!/usr/bin/env python
# -*- mode:python; coding:utf-8; indent-tabs-mode:nil -*-
########################################################
#   ファイルマネージャ WSGIインタフェイス
########################################################

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import re
import cgi
import functools
import mimetypes
from cStringIO import StringIO
import proc
try:
    import conf
except ImportError:
    import conf_default as conf


class StatusException(Exception):
    def __init__(self, status, headers, body=''):
        self.status = status
        self.headers = headers
        self.body = body


def staticfile(form, filename, basepath=conf.DOCUMENT_ROOT):
    '''静的応答'''
    filepath = os.path.join(basepath, filename or 'index.html')
    if not os.path.isfile(filepath):
        raise StatusException('404 Not Found', [])

    # ヘッダ構成
    headers = [
        ('Content-Length', str(os.path.getsize(filepath))),
    ]
    mimetype, encoding = mimetypes.guess_type(filepath)
    if mimetype:
        headers.append(('Content-Type', mimetype))
    return headers, open(filepath, 'rb')


URI_MAP = (
    (r'^%sproc/files$'   % conf.BASE_URI, conf.auth(proc.getlist)),
    (r'^%sproc/upload$'  % conf.BASE_URI, conf.auth(proc.upload)),
    (r'^%sproc/delete$'  % conf.BASE_URI, conf.auth(proc.delete)),
    (r'^%sproc/archive$' % conf.BASE_URI, conf.auth(proc.archive)),

    # 静的ファイル応答
    (r'^%s(.*)$' % conf.FILES_URL, conf.auth(functools.partial(staticfile, basepath=conf.FILES_DIR))),
    (r'^%s(.*)$' % conf.BASE_URI,  conf.auth(staticfile)),
)


def application(environ, start_response):
    form = cgi.FieldStorage(environ['wsgi.input'], environ=environ)

    # mod_wsgi では REQUEST_URI がフルパス。スタンドアロン起動した場合は PATH_INFO がフルパス。
    path = (environ.get('REQUEST_URI') or environ.get('PATH_INFO') or '').split('?')[0]

    for uri, func in URI_MAP:
        m = re.match(uri, path)
        if m:
            # URIを処理するプロシジャが見つかった
            try:
                headers, result = func(form, *m.groups())
                start_response('200 OK', headers)
            except StatusException, e:
                # ステータス応答
                start_response(e.status, e.headers)
                result = e.body
            except:
                # エラー発生
                import traceback
                start_response('500 Internal Server Error', [('Content-type', 'text/plain')])
                result = traceback.format_exc()
                print result
            return result

    start_response('404 Not Found', [])
    return ''


if __name__ == '__main__':
    from wsgiref import simple_server
    simple_server.make_server('', 8080, application).serve_forever()

