# -*- coding:utf-8; indent-tabs-mode:nil -*-
########################################################
#   ファイルマネージャ プロシジャ本体
########################################################

__all__ = ('getlist', 'upload', 'delete', 'archive')

import os
import socket
import shutil
import json
import zipfile
from cStringIO import StringIO
from datetime import datetime
import conf


class FileItem(dict):
    def __init__(self, filename, basepath):
        self.basepath = basepath
        self['name'] = filename

        filepath = os.path.join(basepath, filename)
        self['mtime'] = os.path.getmtime(filepath)
        self['size'] = os.path.getsize(filepath)

    @classmethod
    def getlist(cls, dirpath, basepath=None):
        if not basepath:
            basepath = dirpath
            dirpath = ''

        files = []
        for filename in os.listdir(os.path.join(basepath, dirpath)):
            if filename.startswith('.'):
                # . で始まるファイルは無視
                continue
            filename = os.path.join(dirpath, filename)

            filepath = os.path.join(basepath, filename)
            if os.path.isdir(filepath):
                # サブディレクトリ再帰
                files += cls.getlist(filename, basepath)
            else:
                # 通常ファイル
                files.append(FileItem(filename, basepath))

        return files


def getlist(form):
    return jsonout({
        'url': conf.FILES_URL,
        'files': FileItem.getlist(conf.FILES_DIR),
        })


def upload(form):
    result = []
    error = False

    if 'files' in form:
        files = form['files']
        if not isinstance(files, list):
            files = [files]
        for item in files:
            result.append({ 'name': item.filename })
            try:
                filepath = os.path.join(conf.FILES_DIR, item.filename)
                shutil.copyfileobj(item.file, open(filepath, 'wb'))
                result[-1]['success'] = True
            except Exception, e:
                result[-1]['error'] = str(e)
                error = True

    return jsonout({
        'message': 'エラーが発生しました' if error else 'アップロードしました',
        'result': result,
        'success': not error,
        })


def delete(form):
    result = []
    error = False

    for filename in form.getlist('files[]'):
        result.append({ 'name': filename })
        try:
            filepath = os.path.join(conf.FILES_DIR, filename)
            os.remove(filepath)
            result[-1]['success'] = True
        except Exception, e:
            result[-1]['error'] = str(e)
            error = True

    return jsonout({
        'message': 'エラーが発生しました' if error else '削除しました',
        'result': result,
        'success': not error,
        })


def archive(form):
    fobj = StringIO()
    z = zipfile.ZipFile(fobj, 'w', zipfile.ZIP_DEFLATED)
    for filename in form.getlist('file'):
        filepath = os.path.join(conf.FILES_DIR, filename)
        z.write(filepath, filename)
    z.close()

    data = fobj.getvalue()
    filename = datetime.now().strftime('files%Y%m%d%H%M%S.zip')
    return [
        ('Content-Type', 'application/x-zip-compressed'),
        ('Content-Length', str(len(data))),
        ('Content-Disposition', 'attachment; filename="%s"' % filename)
    ], data


def jsonout(data):
    result = json.dumps(data)
    return [
        ('Content-Type', 'text/plain'),
        ('Content-Length', str(len(result))),
    ], result

