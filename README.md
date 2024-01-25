# .fs (pronounced 'dot fs')

## What is .fs?

.fs is a mostly-fully-featured, self-hosted, open-source, and extremely easy to deploy solution for hosting your own personal file sharing service. All you need to start is a Vercel free tier account, an AWS free tier S3 bucket, and a MongoDB Atlas free tier DB.

## Instructions

### Getting Started

Fork this repo, and open it up in a code editor (like VSCode). What you'll want to do now is make a copy of .env.example and rename your copy to .env.local.

run `npm i`

### Setting up AWS

You'll need to have a free-tier (or pay as you go) AWS account for this step. If you don't have an account yet, sign up using [this link](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html?refid=em_127222&p=ft&z=1).

Once logged in to AWS, you'll first want to go to the S3 tab, and create a new **NON-ACL, NON-VERSIONED** bucket (optionally) named after your domain where you'll host this on. For example, if you have a domain `example.com`, you'll name your bucket `dotfs.example.com` and setup a `CNAME` DNS record from `dotfs.example.com` to point to the actual bucket URL, which will look something like `https://<bucket-name>.s3.<region>.amazonaws.com/`. Note that you don't need to name your bucket this; however, you will need to modify the AWS_URL to match your full bucket url.

<img width="816" alt="Disable blocking public access" src="https://github.com/Soar1826/.fs/assets/34289582/e3e35a08-21ba-42be-bafc-ed8d25be88ec">

Please make sure to uncheck the above boxes.

Next, add the bucket url you just created to the .env.local you made earlier in the requisite variable.

Then, go to the bucket's `Permissions` page, scroll down, and edit the CORS configuration. Paste in the following code block, but make sure to replace the sections in brackets:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "POST",
            "GET",
            "PUT",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "https://[your-aws-bucket-domain]",
            "https://[your-site-subdomain]",
        ],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]
```

<img width="1129" alt="Screenshot 2024-01-25 at 1 28 46 AM" src="https://github.com/Soar1826/.fs/assets/34289582/31ac734d-197f-461c-b49e-a246f26d5e61">

Now, head over to the bucket's `Management` tab. You'll want to create the above listed rules, each of them having the same structure as shown in the following image, except for the day counts. This is part of what allows the auto-deletion to work. They must have the tags exactly as shown.

<img width="539" alt="Screenshot 2024-01-25 at 1 32 40 AM" src="https://github.com/Soar1826/.fs/assets/34289582/99a6322c-571c-493d-8409-e97e67c6e54c">

Finally, for AWS, the last thing you need to do is create a user and IAM service credentials so that .fs can access your AWS bucket. You can name the user whatever you want, but please make sure to select `Attach Policies Directly` and then add the `AmazonS3FullAccess` policy to allow this account full access. Then, create the account's credentials by going into the user's panel > `Security Credentials` and scroll down to `Access Keys`, and click `Create Access Key`.

You'll want to select `Application Running Outside AWS` and ignore the warning that comes up, and then copy and paste the credentials into your .env.local file in their requisite spots. This is the only time you'll be able to see these creds, so make sure to either take a pic or immediately copy them down.

### Setting up MongoDB

TODO
