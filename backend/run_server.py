import uvicorn

if __name__ == "__main__":
    # 这样启动，既规范又不用敲那么长的命令
    # app.main:app 意思是: app文件夹下的main文件里的app对象
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
