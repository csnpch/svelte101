<script>

    import convert from './../../utils/functions/converts'

    let valueStrToLowcase = null
    let resultStrToLowcase = null

    function onConvertStrToLowcase() {
        if (!valueStrToLowcase) return
        resultStrToLowcase = convert.converToLowercase(valueStrToLowcase)
    }

</script>


<div class="card-service">
    <div class="title-service">
        <p>Convert String to Lowercase</p>
    </div>
    <div class="body-service">
        <input 
            type="text"
            bind:value={valueStrToLowcase}
            placeholder="text" 
        />
    </div>
    <div class="action-service">
        <button class="decorative-button" on:click={onConvertStrToLowcase}>Random</button>
    </div>
    <div class="result-service">
        <p>Result : &nbsp;{resultStrToLowcase|| '-'}</p>
    </div>
</div>