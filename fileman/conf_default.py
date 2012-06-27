# -*- coding:utf-8; indent-tabs-mode:nil -*-
########################################################
#   ファイルマネージャ 環境設定
########################################################

import os

# 基準URIパス
BASE_URI = '/'

# 静的ファイルの場所
DOCUMENT_ROOT = os.path.join(os.path.dirname(__file__), 'htdocs')

# アップロードファイルを置く場所
FILES_DIR = os.path.join(os.path.dirname(__file__), 'files')

# アップロードファイルのアクセスURL
FILES_URL = '%sfiles/' % BASE_URI

# 認証デコレータ
auth = lambda func: func

# 認証サンプル
def _auth(func):
    def myfunc(request, *args, **kwargs):
        # セッション等を使って認証チェック
        if request.session.get('userid'):
            # 認証OKの場合はデコレートした関数を呼ぶ
            return func(request, *args, **kwargs)
        else:
            # 認証NGの場合はログイン画面等へリダイレクト
            from django.http import HttpResponseRedirect
            request.session.flush()
            return HttpResponseRedirect('/login')
    # デコレートした関数を返す
    return myfunc

