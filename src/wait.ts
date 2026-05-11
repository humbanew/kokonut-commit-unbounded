/**
 * Wait for a specified number of milliseconds
 * @param milliseconds - The number of milliseconds to wait
 * @returns A promise that resolves after the specified time
 * @throws If milliseconds is not a number
 */
export async function wait(milliseconds: number): Promise<void> {
    if (typeof milliseconds !== 'number' || isNaN(milliseconds)) {
        throw new Error('milliseconds is not a number')
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, milliseconds)
    })
}
