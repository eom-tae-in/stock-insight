declare module 'google-trends-api' {
  interface InterestOverTimeOptions {
    keyword: string | string[]
    startTime?: Date
    endTime?: Date
    granularTimeResolution?: boolean
  }

  interface GoogleTrendsApiModule {
    interestOverTime(options: InterestOverTimeOptions): Promise<string>
  }

  const googleTrends: GoogleTrendsApiModule
  export default googleTrends
}
