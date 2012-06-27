# -*- coding:utf-8; indent-tabs-mode:nil -*-
########################################################
#   ファイルマネージャ Djangoインタフェイス
########################################################

from cStringIO import StringIO
import cgi
import functools
from django.conf.urls.defaults import url
from django.views.static import serve
from django.http import HttpResponse
import proc
import conf


def response(request, func, mimetype='text/plain'):
    form = cgi.FieldStorage(StringIO(request.raw_post_data), environ=request.META)
    headers, result = func(form)
    response = HttpResponse(result, mimetype)
    for key, value in headers:
        response[key] = value
    return response


def staticfile(request, path):
    '''静的ファイル応答'''
    # 認証不要な場合はWebサーバから直接応答した方がよい
    return serve(request, document_root=conf.DOCUMENT_ROOT, path=path or 'index.html')


urlpatterns = [
    # 処理プロシジャ
    url(r'^proc/files$',   conf.auth(functools.partial(response, func=proc.getlist))),
    url(r'^proc/upload$',  conf.auth(functools.partial(response, func=proc.upload))),
    url(r'^proc/delete$',  conf.auth(functools.partial(response, func=proc.delete))),
    url(r'^proc/archive$', conf.auth(functools.partial(response, func=proc.archive))),

    # 静的ファイル応答
    url(r'^(?P<path>.*)$', conf.auth(staticfile)),
]

