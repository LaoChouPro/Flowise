jest.mock('@langchain/google-genai', () => ({
    GoogleGenerativeAIEmbeddings: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['Embeddings']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

jest.mock('../../../src/modelLoader', () => ({
    MODEL_TYPE: { EMBEDDING: 'embedding' },
    getModels: jest.fn()
}))

jest.mock('../../../src/httpSecurity', () => ({
    checkDenyList: jest.fn()
}))

import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { checkDenyList } from '../../../src/httpSecurity'

const { nodeClass: GoogleGenerativeAIEmbedding } = require('./GoogleGenerativeAIEmbedding')

describe('GoogleGenerativeAIEmbedding', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getCredentialData as jest.Mock).mockResolvedValue({ googleGenerativeAPIKey: 'test-api-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])
        ;(checkDenyList as jest.Mock).mockResolvedValue(undefined)
    })

    it('passes a custom base URL to GoogleGenerativeAIEmbeddings after validating it', async () => {
        const node = new GoogleGenerativeAIEmbedding()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'gemini-embedding-001',
                    tasktype: 'RETRIEVAL_QUERY',
                    stripNewLines: true,
                    baseUrl: 'https://gemini.example.com'
                }
            },
            '',
            {}
        )

        expect(node.inputs).toContainEqual(
            expect.objectContaining({
                name: 'baseUrl',
                type: 'string',
                optional: true,
                additionalParams: true
            })
        )
        expect(checkDenyList).toHaveBeenCalledWith('https://gemini.example.com')
        expect(model.fields).toMatchObject({
            apiKey: 'test-api-key',
            modelName: 'gemini-embedding-001',
            taskType: 'RETRIEVAL_QUERY',
            stripNewLines: true,
            baseUrl: 'https://gemini.example.com'
        })
    })

    it('uses the default endpoint when no base URL is configured', async () => {
        const node = new GoogleGenerativeAIEmbedding()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'gemini-embedding-001'
                }
            },
            '',
            {}
        )

        expect(checkDenyList).not.toHaveBeenCalled()
        expect(model.fields).not.toHaveProperty('baseUrl')
    })

    it('does not create a model when the custom base URL is denied', async () => {
        ;(checkDenyList as jest.Mock).mockRejectedValue(new Error('URL is denied'))
        const node = new GoogleGenerativeAIEmbedding()

        await expect(
            node.init(
                {
                    credential: 'cred-1',
                    inputs: {
                        modelName: 'gemini-embedding-001',
                        baseUrl: 'https://denied.example.com'
                    }
                },
                '',
                {}
            )
        ).rejects.toThrow('URL is denied')
        expect(GoogleGenerativeAIEmbeddings).not.toHaveBeenCalled()
    })
})
