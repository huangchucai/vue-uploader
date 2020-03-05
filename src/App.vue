<template>
    <div>
        <div>计算文件 hash</div>
        <div>总进度</div>
        <el-progress :percentage="fakeUploadPercentage"></el-progress>
        <input type="file" @change="handleFileChange"/>
        <el-button @click="handleUpload">上传</el-button>
        <div>
            <el-table :data="data">
                <el-table-column
                        prop="hash"
                        label="切片hash"
                        align="center"
                ></el-table-column>
                <el-table-column label="大小(KB)" align="center" width="120">
                    <template v-slot="{ row }">
                        {{ row.size | transformByte }}
                    </template>
                </el-table-column>
                <el-table-column label="进度" align="center">
                    <template v-slot="{ row }">
                        <el-progress
                                :percentage="row.percentage"
                                color="#909399"
                        ></el-progress>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>
<script>
    import request from './lib/request'

    const SIZE = 10 * 1024 * 1024 // 切片大小
    export default {
        data: () => ({
            container: {
                file: null
            },
            data: [],
            fakeUploadPercentage: 0
        }),
        filters: {
            transformByte(val) {
                return Number((val / 1024).toFixed(0));
            }
        },
        computed: {
            uploadPercentage () {
                if (!this.container.file || !this.data.length) return 0
                const loaded = this.data
                    .map(item => item.size * item.percentage)
                    .reduce((acc, cur) => acc + cur)
                return parseInt((loaded / this.container.file.size).toFixed(2))
            }
        },
        watch: {
            uploadPercentage(now) {
                if (now > this.fakeUploadPercentage) {
                    this.fakeUploadPercentage = now;
                }
            }
        },
        methods: {
            // 生成文件切片
            createFileChunk (file, size = SIZE) {
                const fileChunkList = []
                let cur = 0
                while (cur < file.size) {
                    fileChunkList.push({
                        file: file.slice(cur, cur + size)
                    })
                    cur += size
                }
                return fileChunkList
            },


            handleFileChange (e) {
                const [file] = e.target.files
                if (!file) return
                Object.assign(this.$data, this.$options.data())
                this.container.file = file
            },
            // 上传切片
            async uploadChunks () {
                const requestList = this.data.map(({ chunk, hash, index }) => {
                    const formData = new FormData()
                    formData.append('chunk', chunk)
                    formData.append('hash', hash)
                    formData.append('filename', this.container.file.name)
                    return { formData, index }
                }).map(async ({ formData, index }) => {
                    console.log(formData)
                    return request({
                        url: 'http://localhost:3000',
                        data: formData,
                        onProgress: this.createProgressHandler(this.data[index])
                    })
                })
                await Promise.all(requestList)
                // 合成切片
                await this.mergeRequest()
            },
            async mergeRequest () {
                console.log('merge')
                await request({
                    url: 'http://localhost:3000/merge',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        filename: this.container.file.name,
                        size: SIZE,
                    })
                })
            },
            async handleUpload () {
                if (!this.container.file) return
                const fileChunkList = this.createFileChunk(this.container.file)
                this.data = fileChunkList.map(({ file }, index) => ({
                    chunk: file,
                    index,
                    size: file.size,
                    hash: this.container.file.name + '-' + index, // 文件名 + 数组下标
                    percentage: 0
                }))
                console.log(this.container.file)
                await this.uploadChunks()
            },
            // 创建进度条
            createProgressHandler (item) {
                return e => {
                    item.percentage = parseInt(String((e.loaded / e.total) * 100))
                }
            }
        }
    }
</script>
