function request ({
                      url,
                      method = 'post',
                      data,
                      headers = {},
                      onProgress = e => e,
                      requestList
                  }) {
    return new Promise(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url)
        xhr.upload.onprogress = onProgress
        Object.keys(headers).forEach(key =>
            xhr.setRequestHeader(key, headers[key])
        )
        xhr.send(data)
        xhr.onload = e => {
            resolve({
                data: e.target.response
            })
        }
    })
}

export default request
